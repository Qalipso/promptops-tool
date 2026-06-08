/**
 * Demo mode flag. When NEXT_PUBLIC_DEMO_MODE=true the app is read-only:
 * data comes from mock fixtures (see lib/api DEMO branch) and write surfaces
 * (builder, create/edit/promote) are hidden. Used for the public Vercel demo.
 */
export const IS_DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
