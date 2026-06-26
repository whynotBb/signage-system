/* eslint-disable @next/next/no-img-element */
export function InGuideSlide() {
  return (
    <div className="contents-wrapper">
      <section className="featuresWrap">
        <div className="feature-logo inguide">
          <img src="/signage/images/in-guide-logo.png" alt="In-Guide" />
        </div>
        <div className="title">
          <h3>휴빌론의 실내측위 기술이 집약된 길안내 솔루션</h3>
          <p>
            공간과 환경 특성에 따라 다양한 측위 기술을 복합하여 보다 높은 정확도로 길안내를 제공합니다.<br />
            보행자에게 특화된 다양한 부가 기능을 제공합니다.
          </p>
        </div>
        <div className="contentsWrap">
          <div className="imgWrap">
            <img src="/signage/images/in-guide-ar-feature.png" alt="" />
          </div>
          <ul className="contents coral sm">
            <li>
              <span>01</span>
              <h4>실내 길안내 특화 솔루션</h4>
              <p>실내의 다양한 위치정보를 복합적으로 활용하여 정확한 길안내와 자연스러운 층 이동 등 휴빌론만의 위치측위 기술 노하우로 방문객이 편리하고 직관적으로 이용할 수 있습니다.</p>
            </li>
            <li>
              <span>02</span>
              <h4>보행자를 생각하는 길안내 서비스</h4>
              <p>AR과 2D 지도를 동시에 제공하여 사용성을 높이고 교통약자를 위한 이동하기 편한 경로 옵션을 제공합니다. <br />또한 AR 영역을 통해 길안내 중 다양한 부가정보 제공도 가능합니다.</p>
            </li>
            <li>
              <span>03</span>
              <h4>다양한 부가 기능 제공</h4>
              <p>서비스 지역 방문 전 모의길안내 기능으로 이동경로를 미리 볼 수 있고, 화면에서 뿐만 아니라 음성과 진동으로도 안내해 드리며 다국어를 지원하여 외국인도 편리하게 이용 가능합니다.</p>
            </li>
          </ul>
        </div>
      </section>
    </div>
  )
}
