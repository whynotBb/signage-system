import type { AuthError } from '@supabase/supabase-js'

export function mapAuthError(error: AuthError): string {
  switch (error.code) {
    case 'invalid_credentials':
      return '이메일 또는 비밀번호가 올바르지 않습니다'
    case 'email_not_confirmed':
      return '이메일 인증이 완료되지 않았습니다. 메일함을 확인해주세요'
    case 'over_request_rate_limit':
      return '요청이 너무 많습니다. 잠시 후 다시 시도해주세요'
    case 'user_not_found':
      return '존재하지 않는 계정입니다'
    default:
      return '로그인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요'
  }
}
