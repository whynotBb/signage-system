/* eslint-disable @next/next/no-img-element */
export function SafeInsightSlide() {
  return (
    <div className="contents-wrapper">
      <section className="featuresWrap">
        <div className="feature-logo">
          <img src="/signage/images/safeinsight-logo.png" alt="SafeInsight" />
        </div>
        <div className="title">
          <h3>휴빌론의 산업안전예방 기술이 집약된 솔루션</h3>
          <p>
            CCTV 영상분석과 FTM TAG 기반 위치측위를 기반으로 다양한 현장 정보를 조합하여 <br />
            작업자의 사고를 예방하기 위해 경광등, 관제웹, 관리자용앱 등으로 알림을 제공하는 솔루션 입니다.
          </p>
        </div>
        <div className="contentsWrap">
          <div className="imgWrap">
            <img src="/signage/images/safeinsight-feature.png" alt="" />
          </div>
          <ul className="contents">
            <li>
              <span>01</span>
              <h4>안전사고 예방을 위한 솔루션</h4>
              <p>안전사고가 발생하기 전 위험을 미리 방지하기 위한 예방 목적의 솔루션 입니다.</p>
            </li>
            <li>
              <span>02</span>
              <h4>현장 실증이 검증된 솔루션</h4>
              <p>중소규모의 제조공장부터 초대형 조선소까지 다양한 규모 및 환경의 산업현장에서 실증 검증된 솔루션입니다.</p>
            </li>
            <li>
              <span>03</span>
              <h4>다양한 서비스 옵션 및 유연한 H/W 구성</h4>
              <p>규모, 도입목적, 사용환경 등에 따른 다양한 서비스 옵션 제공 및 유연한 H/W 구성을 통해 최적의 솔루션을 제공합니다.</p>
            </li>
          </ul>
        </div>
      </section>
    </div>
  )
}
