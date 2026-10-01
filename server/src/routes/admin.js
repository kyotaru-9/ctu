import { Router } from 'express'
import { requireAdmin } from '../middleware/auth.js'
import { supabaseAdmin } from '../config/supabase.js'

const router = Router()

router.use(requireAdmin)

/** Shared password shape: eight random base-36 characters plus a fixed tail. */
function generatePassword() {
  return Math.random().toString(36).slice(-8) + 'A1!'
}

/** "BSIT 3A" from a section record, for messages an admin reads. */
function sectionLabel(section) {
  if (!section) return 'section'
  return [section.program, `${section.year_level}${section.section_name}`]
    .filter(Boolean)
    .join(' ')
}

router.get('/dashboard', async (req, res) => {
  try {
    const [sectionsRes, roomsRes, occupationsRes, reportsRes] = await Promise.all([
      supabaseAdmin.from('sections').select('id', { count: 'exact', head: true }).eq('is_active', true),
      supabaseAdmin.from('rooms').select('id', { count: 'exact', head: true }).eq('is_active', true),
      supabaseAdmin.from('occupations').select('id', { count: 'exact', head: true }).eq('occupation_date', new Date().toISOString().split('T')[0]),
      supabaseAdmin.from('reports').select('id', { count: 'exact', head: true })
    ])

    res.json({
      success: true,
      data: {
        totalSections: sectionsRes.count || 0,
        totalRooms: roomsRes.count || 0,
        todaysOccupations: occupationsRes.count || 0,
        totalReports: reportsRes.count || 0
      }
    })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to load dashboard' })
  }
})

// Sections
router.get('/sections', async (req, res) => {
  try {
    console.log('[Server] GET /sections - fetching sections')
    const { data, error } = await supabaseAdmin.from('sections').select('*').order('created_at', { ascending: false })
    if (error) {
      console.error('[Server] Supabase error fetching sections:', error)
      throw error
    }
    console.log('[Server] Sections fetched:', data?.length)
    res.json({ success: true, data })
  } catch (err) {
    console.error('[Server] Error fetching sections:', err)
    res.status(500).json({ success: false, message: err.message || 'Failed to load sections' })
  }
})

/**
 * Creates one section and the login accounts it owns.
 *
 * The regular student account is always created. The special-student account is
 * opt-in through `withSpecial`, because not every section has a special student
 * and an unused login is a credential nobody will ever hand out. The single
 * create route passes `true`; the batch import passes `false`.
 *
 * Throws if the section itself cannot be created or if the regular student
 * account fails, after undoing whatever was written. A failed special-student
 * account is logged and left behind: the section is still usable without it, and
 * the roles endpoint will create it on demand.
 */
async function createSectionWithAccounts(input, { withSpecial = false } = {}) {
  const { data: section, error: sectionError } = await supabaseAdmin
    .from('sections')
    .insert(input)
    .select()
    .single()
  if (sectionError) throw sectionError

  // Generate email and password for student account
  const sectionCode = `${section.program.toLowerCase()}-${section.year_level}${section.section_name.toLowerCase()}`.replace(/\s+/g, '')
  const email = `${sectionCode}@ctu.edu.ph`
  const password = generatePassword()

    // Create Supabase Auth user for regular student
  const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      section_id: section.id,
      section_name: `${section.program} ${section.year_level}${section.section_name}`,
      role: 'student'
    }
  })

  if (authError) {
    console.error('[Server] Auth user creation failed:', authError)
    await supabaseAdmin.from('sections').delete().eq('id', section.id)
    throw authError
  }

  // Create profile for regular student
  const { error: profileError } = await supabaseAdmin.from('profiles').insert({
    auth_user_id: authUser.user.id,
    section_id: section.id,
    role: 'student',
    full_name: `${section.program} ${section.year_level}${section.section_name} Student`,
    is_active: true
  })

  if (profileError) {
    console.error('[Server] Profile creation failed:', profileError)
    await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
    await supabaseAdmin.from('sections').delete().eq('id', section.id)
    throw profileError
  }

  let specialCredentials = null

  if (withSpecial) {
    const specialEmail = `special-${sectionCode}@ctu.edu.ph`
    const specialPassword = generatePassword()

    const { data: specialAuthUser, error: specialAuthError } = await supabaseAdmin.auth.admin.createUser({
      email: specialEmail,
      password: specialPassword,
      email_confirm: true,
      user_metadata: {
        section_id: section.id,
        section_name: `${section.program} ${section.year_level}${section.section_name} (Special)`,
        role: 'student_special'
      }
    })

    if (specialAuthError) {
      console.error('[Server] Special auth user creation failed:', specialAuthError)
      // Don't rollback everything, just log error
    } else {
      // Create profile for student_special
      const { error: specialProfileError } = await supabaseAdmin.from('profiles').insert({
        auth_user_id: specialAuthUser.user.id,
        section_id: section.id,
        role: 'student_special',
        full_name: `${section.program} ${section.year_level}${section.section_name} Special Student`,
        is_active: true
      })

      if (specialProfileError) {
        console.error('[Server] Special profile creation failed:', specialProfileError)
      } else {
        specialCredentials = {
          email: specialEmail,
          password: specialPassword,
          section_id: section.id
        }
      }
    }
  }

  return {
    section,
    credentials: {
      email,
      password,
      section_id: section.id
    },
    specialCredentials
  }
}

router.post('/sections', async (req, res) => {
  try {
    // Sections added one at a time get both logins; a section can be given a
    // special student later through the roles endpoint.
    const { section, credentials, specialCredentials } = await createSectionWithAccounts(req.body, {
      withSpecial: true,
    })
    res.json({ success: true, data: section, credentials, specialCredentials })
  } catch (err) {
    console.error('[Server] Error creating section:', err)
    res.status(500).json({ success: false, message: err.message || 'Failed to create section' })
  }
})

/** Upper bound on one import, so a malformed file cannot tie up the server. */
const BATCH_LIMIT = 500

const BATCH_COLUMNS = ['mayor_name', 'program', 'year_level', 'section_name', 'shift']
const BATCH_SHIFTS = ['day', 'night']

/**
 * Bulk section import.
 *
 * The spreadsheet is parsed in the browser and arrives here as plain JSON rows,
 * one per line of the sheet, already mapped to the sections columns. Each row
 * goes through the same createSectionWithAccounts path as the add-section form,
 * so an imported section and a hand-created one are indistinguishable — except
 * that an import only creates the regular student login, never a special one.
 *
 * Rows are validated here rather than trusted, because the client is not the
 * only possible caller. A row that names a section which already exists — by
 * the UNIQUE(program, year_level, section_name, shift) constraint — is reported
 * as skipped instead of failing the whole file, so re-running an import after a
 * partial failure is safe.
 */
router.post('/sections/batch', async (req, res) => {
  try {
    const rows = Array.isArray(req.body?.rows) ? req.body.rows : null
    if (!rows?.length) {
      return res.status(400).json({ success: false, message: 'The file has no rows to import' })
    }
    if (rows.length > BATCH_LIMIT) {
      return res.status(400).json({
        success: false,
        message: `A single import is limited to ${BATCH_LIMIT} rows. Split the file and try again.`,
      })
    }

    const created = []
    const skipped = []
    const failed = []

    for (const [index, row] of rows.entries()) {
      const label = `Row ${index + 2}`

      const values = {}
      for (const column of BATCH_COLUMNS) {
        const value = typeof row?.[column] === 'string' ? row[column].trim() : row?.[column]
        values[column] = value === undefined || value === null ? '' : String(value)
      }

      const missing = ['program', 'year_level', 'section_name'].filter((column) => !values[column])
      if (missing.length) {
        failed.push({ row: label, reason: `Missing ${missing.join(', ')}` })
        continue
      }

      // year_level is TEXT on the sections table, so a numeric cell from the
      // spreadsheet is stringified rather than sent as a number.
      values.shift = values.shift.toLowerCase()
      if (!values.shift) {
        values.shift = 'day'
      } else if (!BATCH_SHIFTS.includes(values.shift)) {
        failed.push({ row: label, reason: `Unknown shift "${values.shift}"` })
        continue
      }

      const identity = {
        program: values.program,
        year_level: values.year_level,
        section_name: values.section_name,
        shift: values.shift,
      }

      const { data: existing, error: lookupError } = await supabaseAdmin
        .from('sections')
        .select('id')
        .eq('program', identity.program)
        .eq('year_level', identity.year_level)
        .eq('section_name', identity.section_name)
        .eq('shift', identity.shift)
        .maybeSingle()

      if (lookupError) {
        failed.push({ row: label, reason: 'Could not check whether this section already exists' })
        continue
      }

      if (existing) {
        skipped.push({ row: label, reason: 'Section already exists', section: identity })
        continue
      }

      try {
        // No special-student login: an import is a list of ordinary class
        // sections, and a special student is assigned per section afterwards
        // through PUT /sections/:id/roles.
        const result = await createSectionWithAccounts({
          ...identity,
          mayor_name: values.mayor_name || null,
          student_type: 'student',
        })

        created.push({
          row: label,
          section: result.section,
          mayor_name: result.section.mayor_name,
          credentials: result.credentials,
        })
      } catch (err) {
        console.error(`[Server] Batch import failed at ${label}:`, err)
        failed.push({ row: label, reason: err.message || 'Could not create this section' })
      }
    }

    console.log(
      `[Server] Batch import finished - ${created.length} created, ${skipped.length} skipped, ${failed.length} failed`
    )

    res.json({
      success: true,
      data: {
        created,
        skipped,
        failed,
        total: rows.length,
      },
    })
  } catch (err) {
    console.error('[Server] Error importing sections:', err)
    res.status(500).json({ success: false, message: err.message || 'Failed to import sections' })
  }
})

router.get('/sections/:id', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from('sections').select('*').eq('id', req.params.id).single()
    if (error) throw error
    res.json({ success: true, data })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to load section' })
  }
})

router.put('/sections/:id', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from('sections').update(req.body).eq('id', req.params.id).select().single()
    if (error) throw error
    res.json({ success: true, data })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update section' })
  }
})

// Update student roles for a section
router.put('/sections/:id/roles', async (req, res) => {
  try {
    const { sectionId } = req.params
    const { studentEnabled, specialEnabled } = req.body

    // Update regular student profile
    if (studentEnabled !== undefined) {
      const { data: studentProfiles } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('section_id', sectionId)
        .eq('role', 'student')

      if (studentProfiles && studentProfiles.length > 0) {
        for (const profile of studentProfiles) {
          await supabaseAdmin
            .from('profiles')
            .update({ is_active: studentEnabled })
            .eq('id', profile.id)
          
          // Also update auth user
          await supabaseAdmin.auth.admin.updateUserById(profile.auth_user_id, {
            user_metadata: { ...profile, is_active: studentEnabled }
          })
        }
      } else if (studentEnabled) {
        // Create new student if doesn't exist
        const { data: section } = await supabaseAdmin.from('sections').select('*').eq('id', sectionId).single()
        if (section) {
          const sectionCode = `${section.program.toLowerCase()}-${section.year_level}${section.section_name.toLowerCase()}`.replace(/\s+/g, '')
          const email = `${sectionCode}@ctu.edu.ph`
          const password = generatePassword()

          const { data: authUser } = await supabaseAdmin.auth.admin.createUser({
            email, password, email_confirm: true,
            user_metadata: { section_id: section.id, section_name: `${section.program} ${section.year_level}${section.section_name}`, role: 'student' }
          })
          
          if (authUser.user) {
            await supabaseAdmin.from('profiles').insert({
              auth_user_id: authUser.user.id,
              section_id: section.id,
              role: 'student',
              full_name: `${section.program} ${section.year_level}${section.section_name} Student`,
              is_active: true
            })
          }
        }
      }
    }

    // Update special student profile
    if (specialEnabled !== undefined) {
      const { data: specialProfiles } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('section_id', sectionId)
        .eq('role', 'student_special')

      if (specialProfiles && specialProfiles.length > 0) {
        for (const profile of specialProfiles) {
          await supabaseAdmin
            .from('profiles')
            .update({ is_active: specialEnabled })
            .eq('id', profile.id)
          
          await supabaseAdmin.auth.admin.updateUserById(profile.auth_user_id, {
            user_metadata: { ...profile, is_active: specialEnabled }
          })
        }
      } else if (specialEnabled) {
        // Create new special student if doesn't exist
        const { data: section } = await supabaseAdmin.from('sections').select('*').eq('id', sectionId).single()
        if (section) {
          const sectionCode = `${section.program.toLowerCase()}-${section.year_level}${section.section_name.toLowerCase()}`.replace(/\s+/g, '')
          const specialEmail = `special-${sectionCode}@ctu.edu.ph`
          const specialPassword = generatePassword()

          const { data: authUser } = await supabaseAdmin.auth.admin.createUser({
            email: specialEmail, password: specialPassword, email_confirm: true,
            user_metadata: { section_id: section.id, section_name: `${section.program} ${section.year_level}${section.section_name} (Special)`, role: 'student_special' }
          })
          
          if (authUser.user) {
            await supabaseAdmin.from('profiles').insert({
              auth_user_id: authUser.user.id,
              section_id: section.id,
              role: 'student_special',
              full_name: `${section.program} ${section.year_level}${section.section_name} Special Student`,
              is_active: true
            })
          }
        }
      }
    }

    res.json({ success: true, message: 'Roles updated' })
  } catch (err) {
    console.error('[Server] Error updating roles:', err)
    res.status(500).json({ success: false, message: err.message || 'Failed to update roles' })
  }
})

/**
 * Regenerates the password on every login account a section owns.
 *
 * Addresses are derived once when the section is created and are never changed,
 * so each new password is handed back against the existing email. A section can
 * own both a regular and a special-student login, so accounts are returned as a
 * list and the admin is shown one block per role. Sections with no account yet
 * get a 404 rather than an invented address — the admin creates those
 * explicitly through the add-section or roles flow.
 */
router.post('/sections/:id/regenerate-credentials', async (req, res) => {
  try {
    const { id: sectionId } = req.params

    const { data: profiles, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('auth_user_id, role')
      .eq('section_id', sectionId)

    if (profileError) throw profileError

    if (!profiles?.length) {
      return res.status(404).json({
        success: false,
        message: 'This section has no student account yet',
        error: 'No accounts found'
      })
    }

    const accounts = []

    for (const profile of profiles) {
      // Read the address first: it is the one piece of the credential the admin
      // cannot reconstruct, and it never changes.
      const { data: existing, error: readError } = await supabaseAdmin.auth.admin.getUserById(
        profile.auth_user_id
      )

      if (readError || !existing?.user?.email) {
        console.error(
          '[Server] Could not read account',
          profile.auth_user_id,
          '-',
          readError?.message
        )
        continue
      }

      const password = generatePassword()
      const { error } = await supabaseAdmin.auth.admin.updateUserById(profile.auth_user_id, {
        password
      })

      if (error) {
        console.error('[Server] Password reset failed for', profile.auth_user_id, '-', error.message)
        continue
      }

      accounts.push({
        role: profile.role,
        email: existing.user.email,
        password,
        section_id: sectionId
      })
    }

    if (!accounts.length) {
      return res.status(500).json({
        success: false,
        message: 'Could not reset the password for any account',
        error: 'Reset failed'
      })
    }

    const skipped = profiles.length - accounts.length
    if (skipped > 0) {
      console.log('[Server] Regenerate credentials: skipped', skipped, 'account(s) for section', sectionId)
    }

    console.log('[Server] Regenerated credentials for section', sectionId, '-', accounts.length, 'account(s)')
    res.json({ success: true, message: 'Password regenerated', data: { accounts, skipped } })
  } catch (err) {
    console.error('[Server] Error regenerating credentials:', err)
    res.status(500).json({ success: false, message: err.message || 'Failed to regenerate credentials' })
  }
})

/**
 * Counts what a hard delete would take with it.
 *
 * Every table below references sections(id) ON DELETE CASCADE, so these are the
 * exact row counts the confirmation dialog has to state before the delete goes
 * through. profiles.section_id carries no foreign key at all, so the accounts are
 * not cascaded — the delete route removes them explicitly, and this count is what
 * the dialog uses to say so.
 */
router.get('/sections/:id/impact', async (req, res) => {
  try {
    const sectionId = req.params.id
    const tables = [
      ['accounts', 'profiles'],
      ['schedules', 'schedules'],
      ['occupations', 'occupations'],
      ['submissions', 'room_submissions'],
      ['reports', 'reports'],
      ['complianceRecords', 'compliance_records']
    ]

    const counts = await Promise.all(
      tables.map(async ([key, table]) => {
        const { count, error } = await supabaseAdmin
          .from(table)
          .select('id', { count: 'exact', head: true })
          .eq('section_id', sectionId)
        if (error) throw error
        return [key, count || 0]
      })
    )

    res.json({ success: true, data: Object.fromEntries(counts) })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to check what this section owns' })
  }
})

/**
 * Deletes a section and the logins it owns.
 *
 * The section row itself cascades to everything that references it, but
 * profiles.section_id carries no foreign key, so the accounts are removed by
 * hand here — otherwise a deleted section would leave working student logins
 * behind that can still sign in and see a section that no longer exists.
 *
 * Auth users go first, then the profile rows. Deleting the profile is what
 * actually revokes access, because authentication resolves a token to a profile
 * and refuses the request when there is none. So an auth user that fails to
 * delete becomes an unreachable orphan rather than a live account, and the
 * delete still goes through.
 */
router.delete('/sections/:id', async (req, res) => {
  try {
    const sectionId = req.params.id

    const { data: accounts, error: accountError } = await supabaseAdmin
      .from('profiles')
      .select('id, auth_user_id')
      .eq('section_id', sectionId)

    if (accountError) throw accountError

    let revoked = 0
    for (const account of accounts ?? []) {
      const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(account.auth_user_id)
      if (authError) {
        // Left in place deliberately. The profile delete below cuts its access
        // off, and leaving the account lets an admin clean it up by hand.
        console.error(
          '[Server] Could not delete auth user',
          account.auth_user_id,
          '-',
          authError.message
        )
        continue
      }
      revoked += 1
    }

    if (accounts?.length) {
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .delete()
        .eq('section_id', sectionId)

      if (profileError) throw profileError
    }

    // A real delete, not a deactivate. PostgREST reports a delete that matched
    // nothing as an empty result rather than an error, hence maybeSingle.
    const { data, error } = await supabaseAdmin
      .from('sections')
      .delete()
      .eq('id', sectionId)
      .select('id')
      .maybeSingle()

    if (error) throw error
    if (!data) {
      return res.status(404).json({ success: false, message: 'Section not found' })
    }

    const stranded = (accounts?.length ?? 0) - revoked
    if (stranded > 0) {
      console.log(
        `[Server] Section ${sectionId} deleted; ${stranded} auth account(s) could not be removed and need manual cleanup`
      )
    }

    res.json({
      success: true,
      message: 'Section deleted',
      data: { accountsDeleted: accounts?.length ?? 0, authUsersRemoved: revoked }
    })
  } catch (err) {
    console.error('[Server] Error deleting section:', err)
    res.status(500).json({ success: false, message: err.message || 'Failed to delete section' })
  }
})

/**
 * Enables or disables a section together with the logins it owns.
 *
 * `is_active` in the body sets the state outright; omitting it flips whatever the
 * section currently is. The flip form matters because the table's button is a
 * toggle — sending nothing used to arrive here as `undefined`, which updated no
 * column and failed on the single-row read, leaving the button looking dead.
 *
 * Disabling only the section row would leave working accounts behind: nothing in
 * authentication looks at sections.is_active, so students would still sign in and
 * land on pages for a section the admin has closed. The profiles are flipped in
 * the same pass instead, and authentication already refuses a deactivated
 * profile with "Account is deactivated" — so the access actually goes away.
 *
 * Enabling restores every account the section owns, both roles. The section's
 * data is untouched either way, which is the point: this is a pause, not a
 * delete. See DELETE /sections/:id for the permanent one.
 */
router.patch('/sections/:id/status', async (req, res) => {
  try {
    const sectionId = req.params.id
    const requested = req.body?.is_active
    const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : ''

    let isActive
    if (typeof requested === 'boolean') {
      isActive = requested
    } else {
      const { data: current, error: readError } = await supabaseAdmin
        .from('sections')
        .select('is_active')
        .eq('id', sectionId)
        .maybeSingle()

      if (readError) throw readError
      if (!current) {
        return res.status(404).json({ success: false, message: 'Section not found' })
      }

      isActive = !current.is_active
    }

    // A reason is required to disable, and it is the only explanation a locked-out
    // student ever gets, so an empty one is rejected rather than stored as blank.
    // Enabling needs none: there is nothing left to explain once it is back on.
    if (!isActive && !reason) {
      return res.status(400).json({
        success: false,
        message: 'Give a reason before disabling the section',
        error: 'Reason required',
      })
    }

    const { data: section, error: sectionError } = await supabaseAdmin
      .from('sections')
      .update({ is_active: isActive })
      .eq('id', sectionId)
      .select()
      .single()

    if (sectionError) throw sectionError

    const { data: accounts, error: accountError } = await supabaseAdmin
      .from('profiles')
      .select('id, auth_user_id, role')
      .eq('section_id', sectionId)

    if (accountError) throw accountError

    let updated = 0
    for (const account of accounts ?? []) {
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({ is_active: isActive })
        .eq('id', account.id)

      if (profileError) {
        console.error(
          `[Server] Could not set profile ${account.id} active=${isActive}:`,
          profileError.message
        )
        continue
      }

      // The auth user carries the same flag in its metadata for anything that
      // reads it, but this is cosmetic: authentication reads the profile.
      await supabaseAdmin.auth.admin.updateUserById(account.auth_user_id, {
        user_metadata: { role: account.role, section_id: sectionId, is_active: isActive },
      })

      updated += 1
    }

    if (accounts?.length && updated !== accounts.length) {
      console.log(
        `[Server] Section ${sectionId} set active=${isActive}; ${updated}/${accounts.length} account(s) updated`
      )
    }

    /*
     * The reason goes in audit_logs rather than a column on sections, so it needs
     * no migration and it lands on the admin's existing audit trail for free. The
     * reactivation row is what clears the reason: the sign-in page reads the most
     * recent status entry, so without it a re-enabled section that was disabled
     * again for a different reason would still show the old one.
     */
    const { error: logError } = await supabaseAdmin.from('audit_logs').insert({
      user_id: req.user?.id ?? null,
      action: isActive ? 'section_reactivated' : 'section_deactivated',
      entity_type: 'section',
      entity_id: sectionId,
      description: isActive ? `Section re-enabled: ${sectionLabel(section)}` : reason,
      ip_address: req.ip ?? null,
    })

    if (logError) {
      // The section is already toggled and the accounts already flipped, so this
      // must not fail the request — it would report a change that did happen as
      // a failure. Logged, because a missing reason is worth knowing about.
      console.error('[Server] Could not record the section status change:', logError.message)
    }

    res.json({
      success: true,
      data: section,
      accountsUpdated: updated,
      accountsTotal: accounts?.length ?? 0
    })
  } catch (err) {
    console.error('[Server] Error updating section status:', err)
    res.status(500).json({ success: false, message: err.message || 'Failed to update section status' })
  }
})

// Rooms
/** Upper bound on one import, so a malformed file cannot tie up the server. */
const ROOM_BATCH_LIMIT = 500

const ROOM_BATCH_COLUMNS = ['room_code', 'room_name', 'building', 'floor', 'description']

router.get('/rooms', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from('rooms').select('*').order('created_at', { ascending: false })
    if (error) throw error
    res.json({ success: true, data })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to load rooms' })
  }
})

/**
 * Creates one room with a freshly generated QR token.
 *
 * qr_token is UNIQUE NOT NULL, so it is never taken from the request — the
 * single create route and the batch import both come through here and a room can
 * never be written with a missing or duplicated token.
 */
async function createRoom(input) {
  const crypto = await import('crypto')
  const qrToken = 'qr_' + crypto.randomBytes(32).toString('hex')

  const { data, error } = await supabaseAdmin
    .from('rooms')
    .insert({ ...input, qr_token: qrToken })
    .select()
    .single()

  if (error) throw error
  return data
}

router.post('/rooms', async (req, res) => {
  try {
    const data = await createRoom(req.body)
    res.json({ success: true, data })
  } catch (err) {
    console.error('[Server] Error creating room:', err)
    res.status(500).json({ success: false, message: err.message || 'Failed to create room' })
  }
})

/**
 * Bulk room import.
 *
 * The spreadsheet is parsed in the browser and arrives here as plain JSON rows,
 * one per line of the sheet, already mapped to the rooms columns. Each row goes
 * through the same createRoom path as the add-room form, so an imported room and
 * a hand-created one are indistinguishable.
 *
 * A row naming a room code that already exists is reported as skipped rather than
 * failing the whole file: room_code is UNIQUE, and re-running an import after a
 * partial failure should be safe rather than a wall of errors.
 */
router.post('/rooms/batch', async (req, res) => {
  try {
    const rows = Array.isArray(req.body?.rows) ? req.body.rows : null
    if (!rows?.length) {
      return res.status(400).json({ success: false, message: 'The file has no rows to import' })
    }
    if (rows.length > ROOM_BATCH_LIMIT) {
      return res.status(400).json({
        success: false,
        message: `A single import is limited to ${ROOM_BATCH_LIMIT} rows. Split the file and try again.`,
      })
    }

    const created = []
    const skipped = []
    const failed = []

    for (const [index, row] of rows.entries()) {
      const label = `Row ${index + 2}`

      const values = {}
      for (const column of ROOM_BATCH_COLUMNS) {
        const value = typeof row?.[column] === 'string' ? row[column].trim() : row?.[column]
        values[column] = value === undefined || value === null ? '' : String(value)
      }

      // room_code drives the QR destination and is the room's identity in
      // reports, so it is required; the rest are descriptive.
      const missing = ['room_code', 'room_name'].filter((column) => !values[column])
      if (missing.length) {
        failed.push({ row: label, reason: `Missing ${missing.join(', ')}` })
        continue
      }

      const input = {
        room_code: values.room_code,
        room_name: values.room_name,
        building: values.building || null,
        floor: values.floor || null,
        description: values.description || null,
      }

      const { data: existing, error: lookupError } = await supabaseAdmin
        .from('rooms')
        .select('id')
        .eq('room_code', input.room_code)
        .maybeSingle()

      if (lookupError) {
        failed.push({ row: label, reason: 'Could not check whether this room already exists' })
        continue
      }

      if (existing) {
        skipped.push({ row: label, reason: 'Room code already in use', room: input })
        continue
      }

      try {
        created.push({ row: label, room: await createRoom(input) })
      } catch (err) {
        console.error(`[Server] Batch room import failed at ${label}:`, err)
        failed.push({ row: label, reason: err.message || 'Could not create this room' })
      }
    }

    console.log(
      `[Server] Batch room import finished - ${created.length} created, ${skipped.length} skipped, ${failed.length} failed`
    )

    res.json({
      success: true,
      data: { created, skipped, failed, total: rows.length },
    })
  } catch (err) {
    console.error('[Server] Error importing rooms:', err)
    res.status(500).json({ success: false, message: err.message || 'Failed to import rooms' })
  }
})

router.get('/rooms/:id', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from('rooms').select('*').eq('id', req.params.id).single()
    if (error) throw error
    res.json({ success: true, data })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to load room' })
  }
})

router.put('/rooms/:id', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from('rooms').update(req.body).eq('id', req.params.id).select().single()
    if (error) throw error
    res.json({ success: true, data })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update room' })
  }
})

/**
 * Counts what a room delete takes with it.
 *
 * Every table below references rooms(id) ON DELETE CASCADE, so these are the
 * exact row counts the confirmation dialog has to state before the delete goes
 * through. Deactivating the room instead would keep that history intact, which
 * is what the room's toggle does; this endpoint exists for the permanent delete.
 */
router.get('/rooms/:id/impact', async (req, res) => {
  try {
    const roomId = req.params.id
    const tables = [
      ['schedules', 'schedules'],
      ['occupations', 'occupations'],
      ['submissions', 'room_submissions'],
      ['reports', 'reports']
    ]

    const counts = await Promise.all(
      tables.map(async ([key, table]) => {
        const { count, error } = await supabaseAdmin
          .from(table)
          .select('id', { count: 'exact', head: true })
          .eq('room_id', roomId)
        if (error) throw error
        return [key, count || 0]
      })
    )

    res.json({ success: true, data: Object.fromEntries(counts) })
  } catch (err) {
    console.error('[Server] Error checking what a room owns:', err)
    res.status(500).json({ success: false, message: 'Failed to check what this room owns' })
  }
})

/**
 * Permanently deletes a room.
 *
 * A real delete, not a deactivate: the room row, its QR token and everything
 * referencing it go with it. Every dependent table is ON DELETE CASCADE from
 * rooms(id), so the history is removed by the database rather than row by row.
 * The client's confirmation states that cost first, counted by the impact route
 * above.
 *
 * Use the room's toggle to close a room without losing its history.
 */
router.delete('/rooms/:id', async (req, res) => {
  try {
    // PostgREST reports a delete that matched nothing as an empty result rather
    // than an error, hence maybeSingle.
    const { data, error } = await supabaseAdmin
      .from('rooms')
      .delete()
      .eq('id', req.params.id)
      .select('id')
      .maybeSingle()

    if (error) throw error
    if (!data) {
      return res.status(404).json({ success: false, message: 'Room not found' })
    }

    res.json({ success: true, message: 'Room deleted' })
  } catch (err) {
    console.error('[Server] Error deleting room:', err)
    res.status(500).json({ success: false, message: err.message || 'Failed to delete room' })
  }
})

router.post('/rooms/:id/regenerate-qr', async (req, res) => {
  try {
    const crypto = await import('crypto')
    const qrToken = 'qr_' + crypto.randomBytes(32).toString('hex')
    const { data, error } = await supabaseAdmin.from('rooms').update({ qr_token: qrToken, qr_generated_at: new Date().toISOString() }).eq('id', req.params.id).select().single()
    if (error) throw error
    res.json({ success: true, data })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to regenerate QR' })
  }
})

// Schedules
// Aliased so the embed lands on `section`/`room`, which is what the admin
// schedule table, edit form and delete prompt all read.
const SCHEDULE_SELECT = '*, section:sections(*), room:rooms(*)'

router.get('/schedules', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from('schedules').select(SCHEDULE_SELECT).order('day_of_week').order('start_time')
    if (error) throw error
    res.json({ success: true, data })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to load schedules' })
  }
})

router.post('/schedules', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from('schedules').insert(req.body).select(SCHEDULE_SELECT).single()
    if (error) throw error
    res.json({ success: true, data })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create schedule' })
  }
})

router.get('/schedules/:id', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from('schedules').select(SCHEDULE_SELECT).eq('id', req.params.id).single()
    if (error) throw error
    res.json({ success: true, data })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to load schedule' })
  }
})

router.put('/schedules/:id', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from('schedules').update(req.body).eq('id', req.params.id).select(SCHEDULE_SELECT).single()
    if (error) throw error
    res.json({ success: true, data })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update schedule' })
  }
})

router.delete('/schedules/:id', async (req, res) => {
  try {
    const { error } = await supabaseAdmin.from('schedules').update({ is_active: false }).eq('id', req.params.id)
    if (error) throw error
    res.json({ success: true, message: 'Schedule deactivated' })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete schedule' })
  }
})

// Occupations
// PostgREST keys an embed by the name written in the select, so the aliases
// below are what put `section`/`room`/`schedule` on the row instead of the
// plural table names.
const OCCUPATION_EMBEDS = 'section:sections(id, program, year_level, section_name), room:rooms(*), schedule:schedules(id, section_id, subject_name, instructor_name)'

// The list only needs enough of each submission to draw its Before/After
// column; the detail view fetches the full rows (image_url, notes).
const OCCUPATION_LIST_SELECT = `*, ${OCCUPATION_EMBEDS}, room_submissions(id, submission_type, submitted_at, condition)`
const OCCUPATION_DETAIL_SELECT = `*, ${OCCUPATION_EMBEDS}, room_submissions(*)`

/**
 * Flattens an occupation row for the admin UI: the aliased embeds are already
 * singular, so the only reshaping left is splitting the two room_submissions
 * rows into `before` and `after` by their submission_type.
 */
function shapeOccupation(occupation) {
  const { room_submissions: submissions, ...rest } = occupation
  const shaped = { ...rest, before: null, after: null }

  ;(submissions || []).forEach((submission) => {
    if (submission.submission_type === 'before') shaped.before = submission
    if (submission.submission_type === 'after') shaped.after = submission
  })

  return shaped
}

router.get('/occupations', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from('occupations').select(OCCUPATION_LIST_SELECT).order('occupation_date', { ascending: false })
    if (error) throw error
    res.json({ success: true, data: (data || []).map(shapeOccupation) })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to load occupations' })
  }
})

router.get('/occupations/:id', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from('occupations').select(OCCUPATION_DETAIL_SELECT).eq('id', req.params.id).single()
    if (error) throw error
    res.json({ success: true, data: shapeOccupation(data) })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to load occupation' })
  }
})

// Reports
// Aliased so the embeds land on `section`/`room`, which is what the admin
// reports table and modal read. Unaliased embeds come back plural, so the Room
// and Section columns resolved to nothing. `reason` was already aliased.
const REPORT_SELECT = '*, section:sections(*), room:rooms(*), reason:report_reasons(*)'

router.get('/reports', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from('reports').select(REPORT_SELECT).order('reported_at', { ascending: false })
    if (error) throw error
    res.json({ success: true, data })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to load reports' })
  }
})

router.get('/reports/:id', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from('reports').select(REPORT_SELECT).eq('id', req.params.id).single()
    if (error) throw error
    res.json({ success: true, data })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to load report' })
  }
})

router.patch('/reports/:id/status', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from('reports').update({ status: req.body.status, admin_note: req.body.admin_note, reviewed_at: new Date().toISOString(), reviewed_by: req.user.id }).eq('id', req.params.id).select().single()
    if (error) throw error
    res.json({ success: true, data })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update report status' })
  }
})

// Report Reasons
router.get('/report-reasons', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from('report_reasons').select('*').order('name')
    if (error) throw error
    res.json({ success: true, data })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to load report reasons' })
  }
})

router.post('/report-reasons', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from('report_reasons').insert(req.body).select().single()
    if (error) throw error
    res.json({ success: true, data })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create report reason' })
  }
})

router.put('/report-reasons/:id', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from('report_reasons').update(req.body).eq('id', req.params.id).select().single()
    if (error) throw error
    res.json({ success: true, data })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update report reason' })
  }
})

router.delete('/report-reasons/:id', async (req, res) => {
  try {
    const { error } = await supabaseAdmin.from('report_reasons').update({ is_active: false }).eq('id', req.params.id)
    if (error) throw error
    res.json({ success: true, message: 'Report reason deactivated' })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete report reason' })
  }
})

// Analytics
router.get('/analytics/overview', async (req, res) => {
  try {
    const [sectionsRes, roomsRes, reportsRes, submissionsRes, complianceRes] = await Promise.all([
      supabaseAdmin.from('sections').select('id', { count: 'exact', head: true }).eq('is_active', true),
      supabaseAdmin.from('rooms').select('id', { count: 'exact', head: true }).eq('is_active', true),
      supabaseAdmin.from('reports').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('room_submissions').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('compliance_records').select('compliance_rate')
    ])
    if (complianceRes.error) throw complianceRes.error

    // Averaged from the recorded rates. This used to be a hardcoded 85, which
    // the overview card presented as a real compliance figure.
    const rates = (complianceRes.data || []).map((row) => Number(row.compliance_rate) || 0)
    const avgCompliance = rates.length
      ? Math.round(rates.reduce((sum, rate) => sum + rate, 0) / rates.length)
      : 0

    res.json({
      success: true,
      data: {
        totalSections: sectionsRes.count || 0,
        totalRooms: roomsRes.count || 0,
        totalReports: reportsRes.count || 0,
        totalSubmissions: submissionsRes.count || 0,
        avgCompliance
      }
    })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to load analytics' })
  }
})

router.get('/analytics/sections', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('compliance_records')
      .select('*, section:sections(id, program, year_level, section_name)')
      .order('period_start', { ascending: false })
    if (error) throw error

    // compliance_records keeps its totals under long column names. Renamed here
    // so the table does not have to guess, and `missing` is derived from the two
    // it already had.
    const shaped = (data || []).map((row) => {
      const expected = row.total_expected_submissions || 0
      const completed = row.total_completed_submissions || 0

      return {
        id: row.id,
        section_id: row.section_id,
        section: row.section,
        period_start: row.period_start,
        period_end: row.period_end,
        expected,
        completed,
        missing: Math.max(expected - completed, 0),
        late: row.total_late_submissions || 0,
        compliance_rate: Number(row.compliance_rate) || 0
      }
    })

    res.json({ success: true, data: shaped })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to load section compliance' })
  }
})

router.get('/analytics/rooms', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('reports')
      .select('room_id, reason:report_reasons(name), room:rooms(room_code, room_name)')
    if (error) throw error

    // This used to return one row per report, so the panel could not rank rooms
    // by volume as its own subtitle claims. Aggregate to one row per room.
    const byRoom = new Map()

    ;(data || []).forEach((report) => {
      const key = report.room_id
      if (!key) return

      if (!byRoom.has(key)) {
        byRoom.set(key, {
          room_id: key,
          room_code: report.room?.room_code,
          room_name: report.room?.room_name,
          total_reports: 0,
          reasonCounts: new Map()
        })
      }

      const entry = byRoom.get(key)
      entry.total_reports += 1

      const reason = report.reason?.name
      if (reason) entry.reasonCounts.set(reason, (entry.reasonCounts.get(reason) || 0) + 1)
    })

    const shaped = [...byRoom.values()]
      .map(({ reasonCounts, ...room }) => {
        const top = [...reasonCounts.entries()].sort((a, b) => b[1] - a[1])[0]
        return { ...room, most_common_issue: top?.[0] ?? null }
      })
      .sort((a, b) => b.total_reports - a.total_reports)

    res.json({ success: true, data: shaped })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to load room issues' })
  }
})

router.get('/analytics/reasons', async (req, res) => {
  try {
    const [reasonsRes, reportsRes] = await Promise.all([
      supabaseAdmin.from('report_reasons').select('id, name').order('name'),
      supabaseAdmin.from('reports').select('reason_id')
    ])
    if (reasonsRes.error) throw reasonsRes.error
    if (reportsRes.error) throw reportsRes.error

    // Counted in JS so `count` is a number. The previous
    // `count:reports(count)` embed returned an array of { count } rows, and the
    // bar list tried to render that array as a React child, which threw.
    const counts = new Map()
    ;(reportsRes.data || []).forEach((report) => {
      counts.set(report.reason_id, (counts.get(report.reason_id) || 0) + 1)
    })

    const data = (reasonsRes.data || []).map((reason) => ({
      id: reason.id,
      name: reason.name,
      count: counts.get(reason.id) || 0
    }))

    res.json({ success: true, data })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to load report reasons' })
  }
})

router.get('/analytics/trends', async (req, res) => {
  try {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

    const [reportsRes, submissionsRes] = await Promise.all([
      supabaseAdmin.from('reports').select('reported_at').gte('reported_at', since),
      supabaseAdmin.from('room_submissions').select('submitted_at').gte('submitted_at', since)
    ])
    if (reportsRes.error) throw reportsRes.error
    if (submissionsRes.error) throw submissionsRes.error

    // Bucketed by month, so the panel plots periods instead of listing one row
    // per record — which also gave every row an undefined `period` key.
    const periods = new Map()
    const record = (value, field) => {
      const period = value ? String(value).slice(0, 7) : null
      if (!period) return
      if (!periods.has(period)) periods.set(period, { period, reports: 0, submissions: 0 })
      periods.get(period)[field] += 1
    }

    ;(reportsRes.data || []).forEach((row) => record(row.reported_at, 'reports'))
    ;(submissionsRes.data || []).forEach((row) => record(row.submitted_at, 'submissions'))

    const data = [...periods.values()].sort((a, b) => a.period.localeCompare(b.period))
    res.json({ success: true, data })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to load trends' })
  }
})

// Audit Logs
router.get('/audit-logs', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from('audit_logs').select('*, profiles(full_name)').order('created_at', { ascending: false }).limit(100)
    if (error) throw error
    res.json({ success: true, data })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to load audit logs' })
  }
})

export default router