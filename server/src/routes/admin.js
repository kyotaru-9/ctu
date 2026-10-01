import { Router } from 'express'
import { requireAdmin } from '../middleware/auth.js'
import { supabaseAdmin } from '../config/supabase.js'

const router = Router()

router.use(requireAdmin)

/** Shared password shape: eight random base-36 characters plus a fixed tail. */
function generatePassword() {
  return Math.random().toString(36).slice(-8) + 'A1!'
}

/**
 * The login address for one of a section's accounts.
 *
 * A section can own two — a student and a special student — so the role is part of
 * the address. This is the single place it is built: the four call sites that used
 * to spell it out inline had already drifted, and an address that differs between
 * them is an account the admin can never be shown.
 *
 * Note the shift is not in the address even though section identity includes it,
 * so a day and a night section of the same program, year and name still collide.
 * That is known and left as it is for now; changing it would re-address accounts
 * that have already been handed out.
 */
function sectionEmail(section, role) {
  const code = `${section.program.toLowerCase()}-${section.year_level}${section.section_name.toLowerCase()}`.replace(/\s+/g, '')
  const prefix = role === 'student_special' ? 'special-' : ''
  return `${prefix}${code}@ctu.edu.ph`
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
    const { data, error } = await supabaseAdmin.from('sections').select('*').order('created_at', { ascending: false })
    if (error) {
      console.error('[Server] Supabase error fetching sections:', error)
      throw error
    }
    res.json({ success: true, data })
  } catch (err) {
    console.error('[Server] Error fetching sections:', err)
    res.status(500).json({ success: false, message: err.message || 'Failed to load sections' })
  }
})

/**
 * Creates one section and its student login.
 *
 * Only the regular student account, never a special-student one. A special student
 * is a per-section assignment rather than a property of creating the section, so
 * it is added afterwards through PUT /sections/:id/roles — the same path the batch
 * import already pointed at. Minting one here would hand the admin a second
 * credential they never asked for, for an account nobody may ever use.
 *
 * Throws if the section itself cannot be created or if the account fails, after
 * undoing whatever was written.
 */
async function createSectionWithAccounts(input) {
  const { data: section, error: sectionError } = await supabaseAdmin
    .from('sections')
    .insert(input)
    .select()
    .single()
  if (sectionError) throw sectionError

  // One password for the section. If a special-student account is added later the
  // roles route reuses this same value for it, so the section is always handed out
  // as one set of credentials. It is never stored — it lives only in Supabase Auth,
  // which will not read it back — so this is the moment the password is decided.
  const email = sectionEmail(section, 'student')
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

  return {
    section,
    credentials: {
      email,
      password,
      section_id: section.id
    }
  }
}

router.post('/sections', async (req, res) => {
  try {
    // Student login only. A special student is assigned per section afterwards
    // through the roles endpoint, which is also where it picks up the password
    // created here.
    const { section, credentials } = await createSectionWithAccounts(req.body)
    res.json({ success: true, data: section, credentials })
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
        // No special-student login, exactly as the single add-section route: a
        // special student is assigned per section afterwards through
        // PUT /sections/:id/roles, which reuses this section's password.
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

/**
 * Enables or disables a section's two student logins, creating either one the
 * section does not have yet.
 *
 * Creating a missing account mints a new password for the whole section. The
 * current one is never stored — it lives only in Supabase Auth, which will not read
 * it back — so a new account cannot be given it, and minting a second password here
 * would leave the section holding two accounts that cannot log in with each other.
 * Every account is set to one fresh password instead and all of them are returned
 * below, so the admin can hand out the addresses as well as the password. The
 * password previously in use stops working, which is why that is reported rather
 * than done quietly.
 */
router.put('/sections/:id/roles', async (req, res) => {
  try {
    // req.params.id, not params.sectionId: the route is '/sections/:id/roles', so the
    // only param Express sets is `id`. Reading a `sectionId` here resolved to
    // undefined, every lookup matched nothing, and the route 404'd on a section
    // that plainly existed.
    const sectionId = req.params.id
    const { studentEnabled, specialEnabled } = req.body

    const { data: section, error: sectionError } = await supabaseAdmin
      .from('sections')
      .select('*')
      .eq('id', sectionId)
      .single()

    if (sectionError || !section) {
      return res.status(404).json({ success: false, message: 'Section not found' })
    }

    const wanted = [
      { role: 'student', enabled: studentEnabled, label: 'student' },
      { role: 'student_special', enabled: specialEnabled, label: 'special student' },
    ].filter((entry) => entry.enabled !== undefined)

    if (!wanted.length) {
      return res.status(400).json({ success: false, message: 'No role was named' })
    }

    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('section_id', sectionId)

    if (profilesError) throw profilesError

    // Enable or disable whichever accounts the section already has. Nothing is
    // created here, so toggling a role never disturbs a password already in use.
    for (const { role, enabled } of wanted) {
      for (const profile of profiles.filter((entry) => entry.role === role)) {
        const { error } = await supabaseAdmin
          .from('profiles')
          .update({ is_active: enabled })
          .eq('id', profile.id)

        if (error) {
          console.error(`[Server] Could not set ${role} account for ${sectionId} to ${enabled}:`, error.message)
          continue
        }

        await supabaseAdmin.auth.admin.updateUserById(profile.auth_user_id, {
          user_metadata: { ...profile, is_active: enabled },
        })
      }
    }

    const missing = wanted.filter(
      ({ role, enabled }) => enabled && !profiles.some((profile) => profile.role === role)
    )

    if (!missing.length) {
      return res.json({
        success: true,
        message: 'Roles updated',
        data: { passwordChanged: false, accounts: [] },
      })
    }

    const password = generatePassword()
    const created = []

    for (const { role, label } of missing) {
      const email = sectionEmail(section, role)
      const fullName = `${section.program} ${section.year_level}${section.section_name} ${
        role === 'student_special' ? 'Special Student' : 'Student'
      }`

      const { data: authUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          section_id: section.id,
          section_name: `${section.program} ${section.year_level}${section.section_name}`,
          role,
        },
      })

      if (createError || !authUser?.user) {
        console.error(`[Server] Could not create ${label} account for ${sectionId}:`, createError?.message)

        // Undo what this call already created: a section with half its accounts
        // enabled is worse than one left exactly as it was.
        for (const entry of created) {
          await supabaseAdmin.auth.admin.deleteUser(entry.authUserId)
          await supabaseAdmin.from('profiles').delete().eq('auth_user_id', entry.authUserId)
        }

        return res.status(500).json({
          success: false,
          message: `Could not create the ${label} account`,
        })
      }

      const { error: profileError } = await supabaseAdmin.from('profiles').insert({
        auth_user_id: authUser.user.id,
        section_id: section.id,
        role,
        full_name: fullName,
        is_active: true,
      })

      if (profileError) {
        console.error(`[Server] Could not save ${label} profile for ${sectionId}:`, profileError.message)
        await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)

        for (const entry of created) {
          await supabaseAdmin.auth.admin.deleteUser(entry.authUserId)
          await supabaseAdmin.from('profiles').delete().eq('auth_user_id', entry.authUserId)
        }

        return res.status(500).json({
          success: false,
          message: `Could not save the ${label} account`,
        })
      }

      created.push({ role, email, authUserId: authUser.user.id })
    }

    /*
       The accounts already in use are moved onto the shared password only once every
       new account exists. Doing it the other way round would leave the section's
       working accounts holding a password that the response — returned only on
       success — could never tell the admin about.
    */
    const accounts = created.map(({ role, email }) => ({ role, email, password, section_id: sectionId }))

    for (const profile of profiles) {
      if (created.some((entry) => entry.role === profile.role)) continue

      const { error } = await supabaseAdmin.auth.admin.updateUserById(profile.auth_user_id, { password })

      if (error) {
        console.error(
          `[Server] Could not move ${profile.role} account ${profile.auth_user_id} onto the shared password:`,
          error.message
        )
        continue
      }

      const { data: existing } = await supabaseAdmin.auth.admin.getUserById(profile.auth_user_id)

      accounts.push({
        role: profile.role,
        email: existing?.user?.email ?? null,
        password,
        section_id: sectionId,
      })
    }

    console.log(
      `[Server] Section ${sectionId} roles updated — ${created.length} account(s) created and the section password was reset`
    )

    res.json({
      success: true,
      message: 'Roles updated',
      data: { passwordChanged: true, accounts },
    })
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
 * list and the admin is shown one block per role — every block carrying the same
 * password, because the section is handed out as one set of credentials. Sections
 * with no account yet get a 404 rather than an invented address — the admin
 * creates those explicitly through the add-section or roles flow.
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

    // Generated once for the section rather than inside the loop. Every account a
    // section owns is handed out as one set of credentials, so resetting them one
    // at a time with separate passwords would leave the section's own accounts
    // unable to log in with each other.
    const password = generatePassword()

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

/** Upper bound on one import, so a malformed file cannot tie up the server. */
const SCHEDULE_BATCH_LIMIT = 500

/*
   The sheet numbers the days 1-7 from Sunday, which is the day a school week is
   counted in; the column is 0-6 from Sunday, since that is what JS's Date uses.
   The two differ by one, so the sheet's number arrives as `day` and the column's
   is derived from it here rather than anywhere in the UI, and a spreadsheet and
   an API caller cannot drift into meaning different days by the same number.
*/
const SCHEDULE_BATCH_COLUMNS = ['room_code', 'subject', 'instructor', 'day', 'start', 'end']

/**
 * Accepts the time shapes a hand-made sheet produces: 0700, 700, 07:00 and 7:00,
 * each of them with or without AM/PM — a column Excel has formatted as a time
 * arrives as its display text, so "7:00 PM" is common in a sheet written by
 * someone used to 12-hour time. Returns HH:MM, or null if the value cannot be
 * read as a real time of day. Mirrors the client's reader so the preview shows
 * the value that will be stored.
 */
function normalizeTime(value) {
  const text = String(value ?? '').trim()
  const meridiem = /(am|pm)/i.exec(text)?.[1]?.toLowerCase()
  const digits = (meridiem ? text.replace(/[ap]m/i, '') : text).replace(/[:\s]/g, '')

  // A bare hour is only allowed alongside AM/PM, since "7" alone is not a time.
  const hourOnly = Boolean(meridiem) && /^\d{1,2}$/.test(digits)
  if (!hourOnly && !/^\d{3,4}$/.test(digits)) return null

  let hours = digits.length === 3 ? `0${digits[0]}` : digits.padStart(2, '0').slice(0, 2)
  const minutes = digits.length <= 2 ? '00' : digits.slice(-2)

  if (meridiem) {
    const hour = Number(hours)
    if (hour < 1 || hour > 12) return null
    // 12 AM is midnight and 12 PM is noon, so neither simply gains or loses 12.
    if (meridiem === 'am') {
      hours = hour === 12 ? '00' : hours
    } else {
      hours = hour === 12 ? '12' : String(hour + 12).padStart(2, '0')
    }
  } else if (Number(hours) > 23) {
    return null
  }

  if (Number(minutes) > 59) return null

  return `${hours}:${minutes}`
}

router.post('/schedules/batch', async (req, res) => {
  try {
    const { section_id: sectionId, rows } = req.body ?? {}
    const list = Array.isArray(rows) ? rows : []

    if (!sectionId) {
      return res.status(400).json({ success: false, message: 'A section is required' })
    }
    if (!list.length) {
      return res.status(400).json({ success: false, message: 'The file has no rows to import' })
    }
    if (list.length > SCHEDULE_BATCH_LIMIT) {
      return res.status(400).json({
        success: false,
        message: `A single import is limited to ${SCHEDULE_BATCH_LIMIT} rows. Split the file and try again.`,
      })
    }

    const { data: section } = await supabaseAdmin
      .from('sections')
      .select('id')
      .eq('id', sectionId)
      .maybeSingle()

    if (!section) {
      return res.status(400).json({ success: false, message: 'That section no longer exists' })
    }

    // Every row is read and normalised before anything is written, so a value
    // that cannot be stored is reported rather than inserted as-is.
    const parsed = []
    const failed = []

    for (const [index, row] of list.entries()) {
      const label = `Row ${index + 2}`

      const values = {}
      for (const column of SCHEDULE_BATCH_COLUMNS) {
        const value = typeof row?.[column] === 'string' ? row[column].trim() : row?.[column]
        values[column] = value === undefined || value === null ? '' : String(value)
      }

      const day = Number(values.day)
      const start = normalizeTime(values.start)
      const end = normalizeTime(values.end)

      const problem = !values.room_code
        ? 'Missing room'
        : !values.subject
          ? 'Missing subject'
          : !values.start || !start
            ? `Could not read start time "${values.start}"`
            : !values.end || !end
              ? `Could not read end time "${values.end}"`
              : !Number.isInteger(day) || day < 1 || day > 7
                ? `Day must be 1 to 7, got "${values.day}"`
                : end <= start
                  ? 'End time is not after the start time'
                  : null

      if (problem) {
        failed.push({ row: label, reason: problem })
        continue
      }

      parsed.push({
        __row: label,
        room_code: values.room_code,
        subject_name: values.subject,
        instructor_name: values.instructor || null,
        day_of_week: day - 1,
        start_time: start,
        end_time: end,
      })
    }

    /*
       Rooms are resolved once for the whole file, and one unknown room stops the
       import entirely. A partial import would look like it worked while leaving
       the classes that referenced the missing room unimported, and the admin would
       have no way to tell which half landed. The unknown codes come back by name
       so the fix is obvious rather than a matter of guessing.
    */
    const codes = [...new Set(parsed.map((row) => row.room_code))]
    const { data: rooms, error: roomsError } = await supabaseAdmin
      .from('rooms')
      .select('id, room_code')
      .in('room_code', codes)

    if (roomsError) throw roomsError

    const roomIds = new Map((rooms || []).map((room) => [room.room_code, room.id]))
    const unknown = codes.filter((code) => !roomIds.has(code))

    if (unknown.length) {
      return res.status(400).json({
        success: false,
        message: `No schedules were imported. ${unknown.length === 1 ? 'Room' : 'Rooms'} ${unknown.join(', ')} ${unknown.length === 1 ? 'does' : 'do'} not exist. Check the room column against the room list, then upload the file again.`,
      })
    }

    const created = []
    const skipped = []

    for (const row of parsed) {
      const roomId = roomIds.get(row.room_code)

      // Two classes cannot occupy one room at the same time, so the slot decides
      // whether this row is new. limit(1) rather than maybeSingle, since nothing
      // in the database stops two identical rows already being there.
      const { data: clash } = await supabaseAdmin
        .from('schedules')
        .select('id')
        .eq('section_id', sectionId)
        .eq('room_id', roomId)
        .eq('day_of_week', row.day_of_week)
        .eq('start_time', row.start_time)
        .limit(1)

      if (clash?.length) {
        skipped.push({
          row: row.__row,
          reason: 'This class is already scheduled in that room at that time',
          schedule: { ...row, room_id: roomId, section_id: sectionId },
        })
        continue
      }

      const { data, error } = await supabaseAdmin
        .from('schedules')
        .insert({
          section_id: sectionId,
          room_id: roomId,
          subject_name: row.subject_name,
          instructor_name: row.instructor_name,
          day_of_week: row.day_of_week,
          start_time: row.start_time,
          end_time: row.end_time,
          is_active: true,
        })
        .select(SCHEDULE_SELECT)
        .single()

      if (error) {
        console.error(`[Server] Batch schedule import failed at ${row.__row}:`, error.message)
        failed.push({ row: row.__row, reason: error.message || 'Could not create this schedule' })
        continue
      }

      created.push({ row: row.__row, schedule: data })
    }

    console.log(
      `[Server] Batch schedule import finished - ${created.length} created, ${skipped.length} skipped, ${failed.length} failed`
    )

    res.json({
      success: true,
      data: { created, skipped, failed, total: list.length },
    })
  } catch (err) {
    console.error('[Server] Error importing schedules:', err)
    res.status(500).json({ success: false, message: err.message || 'Failed to import schedules' })
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

/**
 * Counts the history a schedule delete leaves without a class.
 *
 * Occupations hold their schedule_id and that column is ON DELETE SET NULL, so
 * the occupation and its before/after photos are kept; they stop naming the class
 * they were recorded for. Submissions hang off those occupations rather than off
 * the schedule, so they are counted through the occupation ids. Nothing here is
 * destroyed — the client's confirmation says so, and this is what backs that.
 */
router.get('/schedules/:id/impact', async (req, res) => {
  try {
    const { data: occupations, error: occupationsError } = await supabaseAdmin
      .from('occupations')
      .select('id')
      .eq('schedule_id', req.params.id)

    if (occupationsError) throw occupationsError

    const occupationIds = (occupations ?? []).map((occupation) => occupation.id)

    let submissions = 0
    if (occupationIds.length) {
      const { count, error: submissionsError } = await supabaseAdmin
        .from('room_submissions')
        .select('id', { count: 'exact', head: true })
        .in('occupation_id', occupationIds)

      if (submissionsError) throw submissionsError
      submissions = count ?? 0
    }

    res.json({
      success: true,
      data: { occupations: occupationIds.length, submissions },
    })
  } catch (err) {
    console.error('[Server] Error checking what a schedule owns:', err)
    res.status(500).json({ success: false, message: 'Failed to check what this schedule owns' })
  }
})

/**
 * Permanently deletes a schedule.
 *
 * A real delete, not a deactivate: the row leaves the timetable for good. History
 * recorded against it is not destroyed — occupations.schedule_id is ON DELETE
 * SET NULL, so the occupation, its before/after photos and its reports all survive
 * and only stop naming the class. The client's confirmation states that first,
 * counted by the impact route above.
 *
 * Use the schedule's toggle to take a class off the timetable without ending its
 * history, the same choice the room delete offers.
 */
router.delete('/schedules/:id', async (req, res) => {
  try {
    // PostgREST reports a delete that matched nothing as an empty result rather
    // than an error, hence maybeSingle.
    const { data, error } = await supabaseAdmin
      .from('schedules')
      .delete()
      .eq('id', req.params.id)
      .select('id')
      .maybeSingle()

    if (error) throw error
    if (!data) {
      return res.status(404).json({ success: false, message: 'Schedule not found' })
    }

    // Logged, not written to audit_logs, to match the other permanent deletes.
    console.log(`[Server] Schedule deleted: ${req.params.id} — occupations recorded against it keep their history and lose their class link`)

    res.json({ success: true, message: 'Schedule deleted' })
  } catch (err) {
    console.error('[Server] Error deleting schedule:', err)
    res.status(500).json({ success: false, message: err.message || 'Failed to delete schedule' })
  }
})

// Occupations
// PostgREST keys an embed by the name written in the select, so the aliases
// below are what put `section`/`room`/`schedule` on the row instead of the
// plural table names.
const OCCUPATION_EMBEDS = 'section:sections(id, program, year_level, section_name), room:rooms(*), schedule:schedules(id, section_id, subject_name, instructor_name)'

// The list carries image_url as well as the submission summary, because the
// Before/After columns preview the photo on hover and a Done badge that reveals
// nothing until the row is opened is a dead end. Only the URL is sent, not the
// image bytes, so this stays a fraction of the cost of loading the rows.
// notes is still detail-only.
const OCCUPATION_LIST_SELECT = `*, ${OCCUPATION_EMBEDS}, room_submissions(id, submission_type, submitted_at, submitted_time, condition, image_url)`
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
/**
 * Audit log entries, newest first.
 *
 * With no `date`, the latest 100 — the table view, where an older entry is only
 * reachable by picking its day. With `date` and the caller's `offset`, every
 * entry from that local calendar day, which is how the day browser shows a day
 * that has fallen out of the most recent 100. The same window arithmetic as the
 * per-day counts keeps the two views agreeing on what a day contains.
 */
router.get('/audit-logs', async (req, res) => {
  try {
    const { date, offset } = req.query

    const select = '*, profiles(full_name)'

    if (date) {
      if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ success: false, message: 'A date of YYYY-MM-DD is required' })
      }

      const offsetMinutes = Number(offset)
      if (!Number.isFinite(offsetMinutes) || Math.abs(offsetMinutes) > 14 * 60) {
        return res.status(400).json({ success: false, message: 'A valid UTC offset is required' })
      }

      const startUtc = new Date(`${date}T00:00:00.000Z`).getTime() - offsetMinutes * 60_000

      const { data, error } = await supabaseAdmin
        .from('audit_logs')
        .select(select)
        .gte('created_at', new Date(startUtc).toISOString())
        .lt('created_at', new Date(startUtc + 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })

      if (error) throw error
      return res.json({ success: true, data })
    }

    const { data, error } = await supabaseAdmin
      .from('audit_logs')
      .select(select)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) throw error
    res.json({ success: true, data })
  } catch (err) {
    console.error('[Server] Error loading audit logs:', err)
    res.status(500).json({ success: false, message: 'Failed to load audit logs' })
  }
})

/**
 * Entry counts per calendar day, so the cleanup calendar can mark which days
 * have anything to delete.
 *
 * `offset` is the client's UTC offset in minutes, the same one its table view
 * renders dates with. Grouping in UTC instead would split a local day across
 * two cells for anyone east or west of Greenwich — at UTC+8 the last eight hours
 * of a working day would land in the next day's bucket, and the admin would be
 * shown a count that does not match the rows underneath it.
 *
 * Only the timestamp column is read, and PostgREST cannot GROUP BY, so the
 * bucketing happens here. That is fine at this table's size; if it ever grew to
 * millions of rows a stored day column or a database view would be the better
 * shape.
 */
router.get('/audit-logs/dates', async (req, res) => {
  try {
    const offsetMinutes = Number(req.query.offset)
    if (!Number.isFinite(offsetMinutes) || Math.abs(offsetMinutes) > 14 * 60) {
      return res.status(400).json({ success: false, message: 'A valid UTC offset is required' })
    }

    const { data, error } = await supabaseAdmin.from('audit_logs').select('created_at')
    if (error) throw error

    const buckets = new Map()
    for (const row of data ?? []) {
      const local = new Date(new Date(row.created_at).getTime() + offsetMinutes * 60_000)
      const day = local.toISOString().slice(0, 10)
      buckets.set(day, (buckets.get(day) ?? 0) + 1)
    }

    const dates = [...buckets.entries()]
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => b.date.localeCompare(a.date))

    res.json({ success: true, data: { dates, total: data?.length ?? 0 } })
  } catch (err) {
    console.error('[Server] Error counting audit log days:', err)
    res.status(500).json({ success: false, message: 'Failed to load audit log history' })
  }
})

/**
 * Permanently deletes audit log entries, in bulk.
 *
 * Takes a list of local calendar `dates` plus the same `offset` the counts were
 * grouped with, and works out the UTC windows itself, so the days the admin
 * picked are the days that go. `before` also clears everything older than the
 * earliest of them, which is the usual way to bring a growing table back under
 * control.
 *
 * The dates are merged into one range before deleting. Picking three scattered
 * days therefore costs one query rather than three, and — more importantly —
 * there is no window in which a second request could land between two partial
 * deletes and leave the table in a state neither request intended.
 *
 * There is no undo, so the exact count comes back for the client to state in its
 * confirmation.
 */
router.delete('/audit-logs', async (req, res) => {
  try {
    const { dates, before, offset } = req.body ?? {}
    const list = Array.isArray(dates) ? dates : typeof dates === 'string' ? [dates] : []

    const valid = list.filter((day) => typeof day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(day))
    if (!valid.length) {
      return res.status(400).json({ success: false, message: 'At least one date of YYYY-MM-DD is required' })
    }
    if (list.length > 366) {
      return res.status(400).json({ success: false, message: 'Select 366 days or fewer' })
    }

    const offsetMinutes = Number(offset)
    if (!Number.isFinite(offsetMinutes) || Math.abs(offsetMinutes) > 14 * 60) {
      return res.status(400).json({ success: false, message: 'A valid UTC offset is required' })
    }

    // Keys are zero-padded, so lexical order is chronological order.
    const sorted = [...new Set(valid)].sort()
    const DAY_MS = 24 * 60 * 60 * 1000
    const toUtc = (day) => new Date(`${day}T00:00:00.000Z`).getTime() - offsetMinutes * 60_000

    /*
       Adjacent days are merged into a single window so a shift-drag across a
       week is one statement, but a gap in the selection stays a gap. Spanning
       earliest-to-latest instead would silently sweep in every unmarked day in
       between, which is not what the confirm dialog counted.
    */
    const windows = []
    for (const day of sorted) {
      const start = toUtc(day)
      const last = windows[windows.length - 1]
      if (last && start <= last.end) {
        last.end = start + DAY_MS
      } else {
        windows.push({ start, end: start + DAY_MS })
      }
    }

    let deleted = 0

    if (before) {
      /*
         "On and before" is inclusive of the earliest selected day, so the bound
         is the end of that day rather than its start. It carries no lower bound:
         the two modes are opposite windows, and applying both here would ask for
         `created_at >= X AND created_at < X`, matching nothing.
      */
      const endIso = new Date(toUtc(sorted[0]) + DAY_MS).toISOString()
      const { data, error } = await supabaseAdmin
        .from('audit_logs')
        .delete()
        .lt('created_at', endIso)
        .select('id')
      if (error) throw error
      deleted = data?.length ?? 0
    } else {
      for (const { start, end } of windows) {
        const { data, error } = await supabaseAdmin
          .from('audit_logs')
          .delete()
          .gte('created_at', new Date(start).toISOString())
          .lt('created_at', new Date(end).toISOString())
          .select('id')
        if (error) throw error
        deleted += data?.length ?? 0
      }
    }

    // An audit-log delete is an audit event in itself, so it is recorded the way
    // the batch and credential operations are rather than as an error.
    console.log(
      `[Server] Deleted ${deleted} audit log entr${deleted === 1 ? 'y' : 'ies'}${before ? ' before' : ''} ${sorted.join(', ')}`
    )

    res.json({
      success: true,
      message: 'Audit log entries deleted',
      data: { deleted, dates: sorted, before: Boolean(before) }
    })
  } catch (err) {
    console.error('[Server] Error deleting audit logs:', err)
    res.status(500).json({ success: false, message: err.message || 'Failed to delete audit logs' })
  }
})

export default router
