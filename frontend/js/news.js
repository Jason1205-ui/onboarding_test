// js/news.js
(() => {
  // —— Data (can be changed to pictures /Title /Link）——
  const NEWS_DATA = [
    { title: "Toxic whitening creams still available online despite bans",
      excerpt: "Despite regulatory bans, several skin-whitening products containing mercury and other harmful substances continue to be sold through online platforms in Malaysia.",
      link: "https://www.nst.com.my/news/nation/2025/07/1241072/whitening-creams-mercury-banned-substances-still-sold-online",
      image: "images/news1.png"
    },
    { title: "Cosmetic products banned for containing poisons",
      excerpt: "The Health Ministry has banned the sale of two cosmetic products found to contain scheduled poisons, warning the public of serious health risks.",
      link: "https://www.nst.com.my/news/nation/2025/05/1217183/health-ministry-bans-sale-two-cosmetic-products-containing-scheduled",
      image: "images/news2.png"
    },
    { title: "Influencer faces jail over mercury-laced face creams",
      excerpt: "Beauty influencer Beautrice Mok may face prison after her mercury-contaminated skincare products were linked to miscarriages and health issues.",
      link: "https://www.nationalworld.com/news/world/beauty-influencer-beautrice-mok-mercury-face-creams-triggered-abortions-5027195",
      image: "images/news3.png"
    },
    { title: "Women speak out on banned skincare danger",
      excerpt: "40 women came forward after side effects from a banned skincare product still being sold online, highlighting urgent enforcement needs.",
      link: "https://www.nst.com.my/news/nation/2025/02/1181772/40-women-raise-alarm-over-banned-skincare-product-still-being-sold",
      image: "images/news4.jpg"
    },
    { title: "Five cosmetics banned over scheduled poisons",
      excerpt: "Five cosmetic products were banned for containing scheduled poisons; consumers are advised to avoid unapproved items.",
      link: "https://www.nst.com.my/news/nation/2025/02/1171002/five-cosmetic-products-banned-containing-scheduled-poisons",
      image: "images/news5.png"
    },
    { title: "Authorities Seize RM12 Million in Illegal Cosmetics",
      excerpt: "RM12 million worth of unapproved cosmetic products seized since 2021; sellers use fake identities and cross-border shipping.",
      link: "https://thesun.my/malaysia-news/rm12-million-illegal-cosmetics-seized-from-2021-to-2024-EP13492701#google_vignette",
      image: "images/news6.png"
    }
  ];

  const PAGE_SIZE = 3;
  const AUTO_INTERVAL = 5000; // ms

  // Wait for the DOM to be ready
  document.addEventListener('DOMContentLoaded', () => {
    const cardsRoot = document.getElementById('newsCards');
    const dotsRoot  = document.getElementById('newsDots');
    const section   = document.getElementById('latest-news');

    if (!cardsRoot || !dotsRoot) return; 

    const TOTAL_PAGES = Math.ceil(NEWS_DATA.length / PAGE_SIZE);
    let pageIndex = 0;
    let timer = null;

    // Guarantee: If no dots are written, it will be automatically generated
    if (!dotsRoot.querySelector('.news-dot')) {
      dotsRoot.innerHTML = Array.from({ length: TOTAL_PAGES }, (_, i) =>
        `<button class="news-dot ${i===0?'active':''}" data-group="${i}" aria-label="Show group ${i+1}"></button>`
      ).join('');
    }

    function escapeHtml(s){return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]))}

    function renderPage(i){
      const start = i * PAGE_SIZE;
      const slice = NEWS_DATA.slice(start, start + PAGE_SIZE);
      cardsRoot.innerHTML = slice.map(item => {
        const img = item.image
          ? `<img class="news-card-image" src="${item.image}" alt="${escapeHtml(item.title)}">`
          : `<div class="news-card-image" aria-hidden="true"></div>`;
        return `
          <div class="feature-card">
            ${img}
            
            <h3 class="news-title">${escapeHtml(item.title)}</h3>
            <p class="news-excerpt">${escapeHtml(item.excerpt)}</p>
            <a class="news-link" href="${item.link}" target="_blank" rel="noopener">Read More →</a>
          </div>
        `;
      }).join('');

      // Activate dots
      [...dotsRoot.querySelectorAll('.news-dot')].forEach((d, idx) => {
        d.classList.toggle('active', idx === i);
        d.setAttribute('aria-pressed', idx === i ? 'true' : 'false');
      });
    }

    function go(i){ pageIndex = (i + TOTAL_PAGES) % TOTAL_PAGES; renderPage(pageIndex); }
    function startAuto(){ stopAuto(); timer = setInterval(()=>go(pageIndex+1), AUTO_INTERVAL); }
    function stopAuto(){ if (timer) clearInterval(timer); }

    // Dot interaction
    [...dotsRoot.querySelectorAll('.news-dot')].forEach(dot => {
      const idx = Number(dot.dataset.group);
      dot.addEventListener('mouseenter', ()=>go(idx));
      dot.addEventListener('focus', ()=>go(idx));
      dot.addEventListener('click', ()=>go(idx));
    });

    // Hover the entire block pause
    if (section){ section.addEventListener('mouseenter', stopAuto); section.addEventListener('mouseleave', startAuto); }

    go(0);
    startAuto();
  });
})();
