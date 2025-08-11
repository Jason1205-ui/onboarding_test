// 导航系统 JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // 汉堡菜单功能
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const dropdownMenu = document.getElementById('dropdownMenu');
    
    if (hamburgerBtn && dropdownMenu) {
        // 点击汉堡按钮切换下拉菜单
        hamburgerBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            hamburgerBtn.classList.toggle('active');
            dropdownMenu.classList.toggle('show');
        });
        
        // 点击页面其他地方关闭下拉菜单
        document.addEventListener('click', function() {
            hamburgerBtn.classList.remove('active');
            dropdownMenu.classList.remove('show');
        });
        
        // 阻止下拉菜单内的点击事件冒泡
        dropdownMenu.addEventListener('click', function(e) {
            e.stopPropagation();
        });
        
        // 鼠标悬停显示下拉菜单
        hamburgerBtn.addEventListener('mouseenter', function() {
            hamburgerBtn.classList.add('active');
            dropdownMenu.classList.add('show');
        });
        
        // 鼠标离开时隐藏下拉菜单（延迟隐藏）
        const hamburgerMenu = document.querySelector('.hamburger-menu');
        if (hamburgerMenu) {
            let hideTimeout;
            
            hamburgerMenu.addEventListener('mouseleave', function() {
                hideTimeout = setTimeout(() => {
                    hamburgerBtn.classList.remove('active');
                    dropdownMenu.classList.remove('show');
                }, 300);
            });
            
            hamburgerMenu.addEventListener('mouseenter', function() {
                if (hideTimeout) {
                    clearTimeout(hideTimeout);
                }
            });
        }
    }
    
    // 获取当前页面文件名
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    
    // 获取所有导航链接
    const navLinks = document.querySelectorAll('.nav-link');
    
    // 为每个导航链接设置正确的active状态
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        
        // 移除所有active类
        link.classList.remove('active');
        
        // 为当前页面的链接添加active类
        if (href === currentPage || 
            (currentPage === 'index.html' && href === 'index.html') ||
            (currentPage === '' && href === 'index.html')) {
            link.classList.add('active');
        }
    });
    
    // 添加平滑滚动效果（如果页面内有锚点链接）
    const smoothScrollLinks = document.querySelectorAll('a[href^="#"]');
    smoothScrollLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);
            
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
    
    // 添加导航栏滚动效果
    let lastScrollTop = 0;
    const navbar = document.querySelector('.navbar');
    
    window.addEventListener('scroll', function() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        if (scrollTop > lastScrollTop && scrollTop > 100) {
            // 向下滚动时隐藏导航栏
            navbar.style.transform = 'translateY(-100%)';
        } else {
            // 向上滚动时显示导航栏
            navbar.style.transform = 'translateY(0)';
        }
        
        lastScrollTop = scrollTop;
    });
    
    // 为导航栏添加过渡效果
    navbar.style.transition = 'transform 0.3s ease-in-out';
});

