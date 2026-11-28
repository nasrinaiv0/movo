// Webpack alias ONLY for the isolated safety browser fixture. Never part of the app build.
export const supabaseConfigured = true;
export const supabase = {auth:{getSession:async()=>({data:{session:null},error:null})}};
