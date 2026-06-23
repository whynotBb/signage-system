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
    case 'user_already_exists':
      return '이미 가입된 이메일입니다. 로그인 페이지에서 로그인해주세요'
    case 'weak_password':
      return '비밀번호가 너무 약합니다. 대문자와 숫자를 포함해주세요'
    case 'email_address_invalid':
      return '유효하지 않은 이메일 주소입니다'
    case 'signup_disabled':
      return '현재 회원가입이 비활성화되어 있습니다. 관리자에게 문의해주세요'
    case 'over_email_send_rate_limit':
      return '이메일 발송 한도를 초과했습니다. 잠시 후 다시 시도해주세요'
    default:
      return '요청 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요'
  }
}
