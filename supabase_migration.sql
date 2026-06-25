-- visitor_contents 테이블에 DnD 정렬용 display_order 컬럼 추가
ALTER TABLE visitor_contents ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 1;

-- visitor_contents 테이블에 방문일 기록용 visit_date 컬럼 추가
ALTER TABLE visitor_contents ADD COLUMN IF NOT EXISTS visit_date DATE;
