// 공개해도 안전한 값들 (URL, publishable key). 비밀키는 여기 없음.
const SUPABASE_URL = "https://tnvpedaymwozpinujmfk.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_if4i-5B0dSggVrxruBBrLw_ARQUvexF";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
