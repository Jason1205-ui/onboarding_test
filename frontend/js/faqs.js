// FAQ页面交互功能
document.addEventListener('DOMContentLoaded', function() {
    // 获取所有FAQ项目
    const faqItems = document.querySelectorAll('.faq-item');
    
    // 为每个FAQ项目添加点击事件
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        
        question.addEventListener('click', function() {
            // 切换当前项目的展开状态
            item.classList.toggle('active');
            
            // 可选：关闭其他展开的项目（手风琴效果）
            // 如果不需要手风琴效果，可以注释掉下面的代码
            /*
            faqItems.forEach(otherItem => {
                if (otherItem !== item) {
                    otherItem.classList.remove('active');
                }
            });
            */
        });
    });
    
    // 平滑滚动到锚点
    function smoothScrollToAnchor() {
        const hash = window.location.hash;
        if (hash) {
            const target = document.querySelector(hash);
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
                
                // 如果目标是FAQ项目，自动展开
                const faqItem = target.closest('.faq-item');
                if (faqItem) {
                    faqItem.classList.add('active');
                }
            }
        }
    }
    
    // 页面加载时检查锚点
    smoothScrollToAnchor();
    
    // 监听hash变化
    window.addEventListener('hashchange', smoothScrollToAnchor);
    
    // 添加键盘导航支持
    faqItems.forEach((item, index) => {
        const question = item.querySelector('.faq-question');
        
        // 添加tabindex使其可以通过Tab键访问
        question.setAttribute('tabindex', '0');
        
        question.addEventListener('keydown', function(e) {
            switch(e.key) {
                case 'Enter':
                case ' ':
                    e.preventDefault();
                    item.classList.toggle('active');
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    const nextItem = faqItems[index + 1];
                    if (nextItem) {
                        nextItem.querySelector('.faq-question').focus();
                    }
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    const prevItem = faqItems[index - 1];
                    if (prevItem) {
                        prevItem.querySelector('.faq-question').focus();
                    }
                    break;
            }
        });
    });
    
    // 搜索功能（可选）
    function addSearchFunctionality() {
        // 创建搜索框
        const searchContainer = document.createElement('div');
        searchContainer.className = 'faq-search-container';
        searchContainer.innerHTML = `
            <div class="search-box">
                <input type="text" id="faqSearch" placeholder="Search FAQs..." class="faq-search-input">
                <span class="search-icon">🔍</span>
            </div>
        `;
        
        // 插入到FAQ内容之前
        const faqSection = document.querySelector('.faq-section');
        faqSection.insertBefore(searchContainer, faqSection.firstChild);
        
        // 搜索功能
        const searchInput = document.getElementById('faqSearch');
        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            
            faqItems.forEach(item => {
                const question = item.querySelector('.faq-question h3').textContent.toLowerCase();
                const answer = item.querySelector('.faq-answer').textContent.toLowerCase();
                
                if (question.includes(searchTerm) || answer.includes(searchTerm)) {
                    item.style.display = 'block';
                    // 高亮搜索结果
                    if (searchTerm && (question.includes(searchTerm) || answer.includes(searchTerm))) {
                        item.classList.add('search-highlight');
                    } else {
                        item.classList.remove('search-highlight');
                    }
                } else {
                    item.style.display = 'none';
                    item.classList.remove('search-highlight');
                }
            });
            
            // 如果搜索为空，显示所有项目
            if (!searchTerm) {
                faqItems.forEach(item => {
                    item.style.display = 'block';
                    item.classList.remove('search-highlight');
                });
            }
        });
    }
    
    // 可选：启用搜索功能
    // addSearchFunctionality();
});

// 添加搜索高亮样式
const style = document.createElement('style');
style.textContent = `
    .faq-search-container {
        margin-bottom: 30px;
    }
    
    .search-box {
        position: relative;
        max-width: 500px;
        margin: 0 auto;
    }
    
    .faq-search-input {
        width: 100%;
        padding: 15px 50px 15px 20px;
        border: 2px solid #e9ecef;
        border-radius: 25px;
        font-size: 1rem;
        outline: none;
        transition: border-color 0.3s ease;
    }
    
    .faq-search-input:focus {
        border-color: #667eea;
    }
    
    .search-icon {
        position: absolute;
        right: 20px;
        top: 50%;
        transform: translateY(-50%);
        font-size: 1.2rem;
        color: #666;
    }
    
    .faq-item.search-highlight {
        background: #fff3cd !important;
        border-left: 4px solid #ffc107;
    }
`;
document.head.appendChild(style);
