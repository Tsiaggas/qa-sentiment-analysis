'use server'

import { z } from 'zod' // For validation
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

// Define the schema for form validation using Zod
const UserSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  role: z.enum(['agent', 'tl'], { required_error: 'Role is required' }),
  team_leader_id: z.string().uuid('Invalid Team Leader ID').nullable().optional(),
})
// Define the input type inferred from the base schema for use in refine
type UserSchemaInput = z.input<typeof UserSchema>;

const RefinedUserSchema = UserSchema.refine((data: UserSchemaInput) => data.role === 'tl' || !!data.team_leader_id, {
    // If role is 'agent', team_leader_id must be provided (not null/undefined/empty string)
    message: "Team Leader is required for agents",
    path: ["team_leader_id"], // Point error to the team_leader_id field
});

export type FormState = {
    message: string;
    errors?: {
        name?: string[];
        email?: string[];
        password?: string[];
        role?: string[];
        team_leader_id?: string[];
        _form?: string[]; // General form errors
    };
}

export async function addUser(prevState: FormState, formData: FormData): Promise<FormState> {
  const supabaseAdmin = getSupabaseAdmin()
  if (!supabaseAdmin) {
    // Added a general form error field for this case
    return { message: 'Configuration error', errors: { _form: ['Admin client not available. Check server configuration.'] } };
  }

  // Validate form data using the refined schema
  const validatedFields = RefinedUserSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
    role: formData.get('role'),
    // Convert empty string from form to null for validation
    team_leader_id: formData.get('team_leader_id') || null, 
  });

  // Return errors if validation fails
  if (!validatedFields.success) {
    console.log('Validation Errors:', validatedFields.error.flatten().fieldErrors);
    return {
        message: 'Validation failed',
        errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { name, email, password, role, team_leader_id } = validatedFields.data;

  try {
    // 1. Create user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Auto-confirm email for simplicity
    });

    if (authError || !authData.user) {
      console.error('Supabase Auth Error:', authError);
      let baseMessage = `Failed to create user in Auth: ${authError?.message ?? 'Unknown error'}`;
      let fieldErrors: FormState['errors'] = { _form: [baseMessage] }; // Initialize with general error

      if (authError?.message.includes('duplicate key value violates unique constraint "users_email_key"') || authError?.message.includes('User already registered')) {
        baseMessage = 'User with this email already exists.';
        // Add specific email error AND the general form error
        fieldErrors = { ...fieldErrors, email: ['Email already taken'], _form: [baseMessage] }; 
      }
      return { message: baseMessage, errors: fieldErrors };
    }

    const newUserId = authData.user.id;

    // 2. Insert user details into the public users table
    const { error: dbError } = await supabaseAdmin
      .from('users')
      .insert({
        id: newUserId, // Use the ID from Auth
        name: name,
        email: email,
        role: role,
        team_leader_id: role === 'agent' ? team_leader_id : null, // Only set TL for agents
        is_active: true, // Default to active
      });

    if (dbError) {
      console.error('Supabase DB Error:', dbError);
      // Attempt to clean up the Auth user if DB insert fails
      try {
          await supabaseAdmin.auth.admin.deleteUser(newUserId);
          console.log(`Cleaned up Auth user ${newUserId} after DB insert failure.`);
      } catch (cleanupError) {
          console.error(`Failed to cleanup Auth user ${newUserId}:`, cleanupError);
          // Log cleanup failure but still return the original DB error to the user
      }
      const dbErrorMessage = `Failed to save user details to database: ${dbError.message}`;
      return { message: dbErrorMessage, errors: { _form: [dbErrorMessage] } };
    }

  } catch (e) {
    console.error('Unexpected error during user creation:', e);
    const unexpectedErrorMessage = 'An unexpected error occurred. Please try again.';
    return { message: unexpectedErrorMessage, errors: { _form: [unexpectedErrorMessage] } };
  }

  // Revalidate the users path to show the new user
  revalidatePath('/users');
  
  // Redirect back to the users list on success
  redirect('/users');

} 

// --- Update User Action --- 

// Schema for updating user (password is optional)
const UpdateUserSchema = z.object({
  id: z.string().uuid('Invalid User ID'), // Required for identifying the user
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'), // Keep email for reference, but changing it is complex
  password: z.string().min(8, 'Password must be at least 8 characters long').optional().or(z.literal('')), // Optional: only update if provided
  role: z.enum(['agent', 'tl'], { required_error: 'Role is required' }),
  team_leader_id: z.string().uuid('Invalid Team Leader ID').nullable().optional(),
}).refine(data => data.role === 'tl' || !!data.team_leader_id, {
    message: "Team Leader is required for agents",
    path: ["team_leader_id"],
});

// Define the input type inferred from the base schema for use in refine
type UpdateUserSchemaInput = z.input<typeof UpdateUserSchema>;

const RefinedUpdateUserSchema = UpdateUserSchema.refine((data: UpdateUserSchemaInput) => data.role === 'tl' || !!data.team_leader_id, {
    message: "Team Leader is required for agents",
    path: ["team_leader_id"],
});

// Re-use FormState or define a specific one if needed
export type UpdateFormState = FormState; // Can reuse the same structure

export async function updateUser(prevState: UpdateFormState, formData: FormData): Promise<UpdateFormState> {
  const supabaseAdmin = getSupabaseAdmin()
  if (!supabaseAdmin) {
    return { message: 'Configuration error', errors: { _form: ['Admin client not available.'] } };
  }

  // Get user ID from the form data
  const userId = formData.get('id') as string;
  if (!userId) {
      return { message: 'Validation failed', errors: { _form: ['User ID is missing.'] } };
  }

  // Validate form data
  const validatedFields = RefinedUpdateUserSchema.safeParse({
    id: userId,
    name: formData.get('name'),
    email: formData.get('email'), // Include email for validation context if needed
    password: formData.get('password'), // Will be string or null/undefined
    role: formData.get('role'),
    team_leader_id: formData.get('team_leader_id') || null,
  });

  if (!validatedFields.success) {
    console.log('Update Validation Errors:', validatedFields.error.flatten().fieldErrors);
    return {
        message: 'Validation failed',
        errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  // Extract data, omitting email as it's not updated here
  const { name, password, role, team_leader_id } = validatedFields.data;

  try {
    // 1. Update User in DB Table first (less critical than Auth)
    const { error: dbError } = await supabaseAdmin
      .from('users')
      .update({
        name: name,
        role: role,
        team_leader_id: role === 'agent' ? team_leader_id : null,
        // Do not update email here directly, handle via Auth if needed
      })
      .eq('id', userId);

    if (dbError) {
      console.error('Supabase DB Update Error:', dbError);
      const dbErrorMessage = `Failed to update user details: ${dbError.message}`;
      return { message: dbErrorMessage, errors: { _form: [dbErrorMessage] } };
    }

    // 2. Update Auth User (Optional Password Change)
    // Note: Updating email requires email change confirmation flow, omitted for simplicity.
    if (password) { // Only update password if a new one was provided
        const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
            userId,
            { password: password }
        );

        if (authError) {
            console.error('Supabase Auth Update Error:', authError);
            // Don't necessarily rollback DB change, but inform user
            const authErrorMessage = `Failed to update password: ${authError.message}. User details updated, but password remains unchanged.`;
            // Return a specific error message related to password
            return { message: authErrorMessage, errors: { password: ['Failed to update password.'], _form: [authErrorMessage] } };
        }
    }

  } catch (e) {
    console.error('Unexpected error during user update:', e);
    const unexpectedErrorMessage = 'An unexpected error occurred during update.';
    return { message: unexpectedErrorMessage, errors: { _form: [unexpectedErrorMessage] } };
  }

  // Revalidate the users path and the specific user edit path
  revalidatePath('/users');
  revalidatePath(`/users/${userId}/edit`); // Revalidate the edit page too

  // Redirect back to the users list on success
  redirect('/users');
}

// --- Toggle User Status Action --- (Adding this here as well)

export async function toggleUserStatus(userId: string, currentState: boolean): Promise<{ message: string, success: boolean }> {
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
        return { message: 'Admin client not available.', success: false };
    }

    const newState = !currentState;

    try {
        const { error } = await supabaseAdmin
            .from('users')
            .update({ is_active: newState })
            .eq('id', userId);

        if (error) {
            console.error('Error updating user status:', error);
            return { message: `Failed to update status: ${error.message}`, success: false };
        }

        // Revalidate the users list page
        revalidatePath('/users');
        return { message: `User ${newState ? 'activated' : 'deactivated'} successfully.`, success: true };

    } catch (e) {
        console.error('Unexpected error toggling user status:', e);
        return { message: 'An unexpected error occurred.', success: false };
    }
} 