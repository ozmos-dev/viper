/**
 * Demonstration of the new conditional binding requirements
 * 
 * This file shows how the binding parameter is now:
 * - REQUIRED when the bindings array is not empty
 * - OPTIONAL when the bindings array is empty
 */

import { usePage } from './page';
import { ref } from 'vue';

// Example page type with mixed binding requirements
type DemoPageType = {
  props: {
    // No bindings required
    user: { result: { id: number; name: string }; bindings: [] };
    settings: { result: { theme: string }; bindings: [] };
    
    // Bindings required
    userPosts: { result: Array<{ id: number; title: string }>; bindings: ["userId"] };
    categoryPosts: { result: Array<{ id: number; title: string }>; bindings: ["userId", "categoryId"] };
  };
  actions: {
    // No bindings required
    updateProfile: { args: { name: string }; result: { success: boolean }; bindings: [] };
    
    // Bindings required
    createPost: { args: { title: string; content: string }; result: { id: number }; bindings: ["userId"] };
    deletePost: { args: { postId: number }; result: void; bindings: ["userId", "postId"] };
  };
  params: { userId: string };
};

// Create page instance
const demoPage = usePage<DemoPageType>();

// ============================================================================
// ✅ THESE WORK - No bindings required
// ============================================================================

// Queries without bindings - binding parameter is optional
const userQuery = demoPage.useQuery('user');
const settingsQuery = demoPage.useQuery('settings');
const settingsWithOptions = demoPage.useQuery('settings', {}); // Empty options OK

// Mutations without bindings - binding parameter is optional  
const updateMutation = demoPage.useMutation('updateProfile');
const updateMutationWithOptions = demoPage.useMutation('updateProfile', {});

// Forms without bindings - binding parameter is optional
const profileForm = demoPage.useForm('updateProfile', {
  state: { name: 'John Doe' }
});

// ============================================================================
// ✅ THESE WORK - Bindings required and provided correctly
// ============================================================================

// Queries with bindings - binding parameter is required
const userPostsQuery = demoPage.useQuery('userPosts', {
  bind: { userId: ref('123') }
});

const categoryPostsQuery = demoPage.useQuery('categoryPosts', {
  bind: { 
    userId: ref('123'),
    categoryId: ref('456')
  }
});

// Mutations with bindings - binding parameter is required
const createPostMutation = demoPage.useMutation('createPost', {
  bind: { userId: ref('123') }
});

const deletePostMutation = demoPage.useMutation('deletePost', {
  bind: { 
    userId: ref('123'),
    postId: ref('456')
  }
});

// Forms with bindings - binding parameter is required
const createPostForm = demoPage.useForm('createPost', {
  state: { title: 'New Post', content: 'Post content...' },
  bind: { userId: ref('123') }
});

// ============================================================================
// ❌ THESE FAIL - Missing required bindings (compilation errors)
// ============================================================================

// Uncommenting these will cause TypeScript compilation errors:

// Missing binding for query that requires it
// const failingQuery = demoPage.useQuery('userPosts'); // ❌ Error: binding is required

// Missing binding for mutation that requires it  
// const failingMutation = demoPage.useMutation('createPost'); // ❌ Error: binding is required

// Missing binding for form that requires it
// const failingForm = demoPage.useForm('createPost', {
//   state: { title: 'New Post', content: 'Post content...' }
// }); // ❌ Error: binding is required

// ============================================================================
// ❌ THESE FAIL - Invalid binding keys (compilation errors)
// ============================================================================

// Invalid binding key
// const invalidBinding = demoPage.useQuery('userPosts', {
//   bind: { invalidKey: ref('123') } // ❌ Error: 'invalidKey' doesn't exist in bindings
// });

// Missing required binding key
// const missingKey = demoPage.useQuery('categoryPosts', {
//   bind: { userId: ref('123') } // ❌ Error: missing 'categoryId'
// });

// ============================================================================
// Summary
// ============================================================================

/**
 * The new conditional binding system provides:
 * 
 * ✅ Type Safety: 
 *    - Binding is REQUIRED when bindings array is not empty
 *    - Binding is OPTIONAL when bindings array is empty
 * 
 * ✅ Developer Experience:
 *    - No need to pass empty binding objects
 *    - Clear compilation errors for missing bindings
 *    - Autocomplete shows only valid binding keys
 * 
 * ✅ Runtime Safety:
 *    - All required bindings are guaranteed to be present
 *    - No invalid binding keys can be passed
 *    - Type-safe binding values (string | number | null)
 */