---
name: project-signage-prd
description: 사이니지 관리 시스템 PRD 작성 완료 — 기술 스택, 역할 체계, 기능 범위 결정 사항
metadata:
  type: project
---

사이니지 관리 시스템(Admin Web App) MVP PRD가 `docs/PRD.md`에 작성되었다.

**Why:** 하드코딩 방식 사이니지를 비개발자도 웹에서 편집할 수 있도록 개선하기 위함.

**How to apply:** 이 프로젝트의 기능 범위, 역할 체계, 기술 스택을 참조할 때 `docs/PRD.md`를 기준으로 삼는다.

## 핵심 결정 사항

- 기능 ID: F001(로그인) ~ F025(계정 비활성화/삭제) — 총 25개
- 페이지: 로그인, 대시보드, 조직도 관리, 뉴스 관리, 방문자 관리, 회사소개 관리, 동영상 관리, 이미지 관리, 사용자 관리 — 총 9개
- 자기 회원가입 없음. 계정 생성은 super_admin이 사용자 관리 페이지에서 직접 수행 (F023)
- 실제 디스플레이 렌더링은 별도 프로젝트로 분리됨

## 역할 체계

- super_admin: 전체 권한 + 사용자 관리
- content_admin: 모든 콘텐츠 등록/수정/삭제
- editor: 뉴스·방문자 등록 + 본인 등록 콘텐츠만 수정/삭제

## 기술 스택 (사용자가 명시한 버전 — 템플릿 기본값과 다름)

- Next.js **16.2.9** (템플릿 기본 15가 아님)
- React **19.2.4**
- TanStack Query **5.101.0**, Zustand **5.0.14**
- React Hook Form **7.80.0**, Zod **4.4.3**
- TailwindCSS 4, shadcn/ui, Supabase, Vercel
