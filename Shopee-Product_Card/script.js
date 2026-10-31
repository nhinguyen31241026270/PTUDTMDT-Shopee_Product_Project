async function synchronizeLayout() {
    if (!document.body.id) document.body.id = 'page-top';
    const header = document.querySelector('.site-header');
    if (header?.dataset.layout === 'shopee-reference' && document.querySelector('.site-footer')) return;
    if (location.protocol === 'file:') return;

    try {
        const response = await fetch('./shared-layout.html', { cache: 'no-store' });
        if (!response.ok) throw new Error('Không tải được bố cục dùng chung.');
        const layout = new DOMParser().parseFromString(await response.text(), 'text/html');
        const nextHeader = layout.querySelector('#shared-header')?.content.firstElementChild;
        const nextFooter = layout.querySelector('#shared-footer')?.content.firstElementChild;
        if (!nextHeader || !nextFooter) throw new Error('Bố cục dùng chung chưa đầy đủ.');
        if (header) header.replaceWith(nextHeader.cloneNode(true));
        else document.body.prepend(nextHeader.cloneNode(true));
        const footer = document.querySelector('.site-footer');
        if (footer) footer.replaceWith(nextFooter.cloneNode(true));
        else document.body.append(nextFooter.cloneNode(true));
    } catch (error) {
        console.warn('Không thể đồng bộ header/footer:', error);
    }
}

async function initializeStorefront() {
    await synchronizeLayout();

    const searchForm = document.querySelector('.search-form');
    const searchInput = document.querySelector('#site-search');
    const productCards = [...document.querySelectorAll('[data-product-category]')];
    const categoryButtons = [...document.querySelectorAll('[data-category]')];
    const headerMenus = [...document.querySelectorAll('.header-menu')];
    const searchStatus = document.querySelector('.search-status');
    const emptyState = document.querySelector('.empty-state');
    const recentProducts = document.querySelector('.recent-products');
    let selectedCategory = 'all';

    function normalizeText(value) {
        return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
    }

    function filterProducts() {
        const query = normalizeText(searchInput.value.trim());
        let visibleCount = 0;

        productCards.forEach(card => {
            const productText = `${card.querySelector('h2').textContent} ${card.querySelector('.product-description').textContent}`;
            const matchesCategory = selectedCategory === 'all' || card.dataset.productDepartment === selectedCategory;
            card.hidden = !matchesCategory || !normalizeText(productText).includes(query);
            if (!card.hidden) visibleCount += 1;
        });

        recentProducts.hidden = !productCards.some(card => recentProducts.contains(card) && !card.hidden);

        categoryButtons.forEach(button => {
            button.setAttribute('aria-pressed', String(button.dataset.category === selectedCategory));
        });

        const categoryName = categoryButtons.find(button => button.dataset.category === selectedCategory).dataset.categoryLabel;
        const filters = [];
        if (selectedCategory !== 'all') filters.push(categoryName);
        if (searchInput.value.trim()) filters.push(`“${searchInput.value.trim()}”`);
        searchStatus.textContent = filters.length ? `${visibleCount} sản phẩm · ${filters.join(' · ')}` : '';
        emptyState.hidden = visibleCount > 0;
    }

    function closeMenus() {
        headerMenus.forEach(menu => { menu.open = false; });
    }

    categoryButtons.forEach(button => {
        button.addEventListener('click', () => {
            selectedCategory = button.dataset.category;
            filterProducts();
            closeMenus();
            // Keep keyboard focus on the trigger after selecting a category.
            button.closest('details').querySelector('summary').focus();
        });
    });

    searchForm.addEventListener('submit', event => {
        event.preventDefault();
        closeMenus();
        filterProducts();
    });

    // Clearing the native search control also restores the current category.
    searchInput.addEventListener('input', filterProducts);

    document.querySelectorAll('[data-reset-filters]').forEach(control => {
        control.addEventListener('click', event => {
            event.preventDefault();
            selectedCategory = 'all';
            searchInput.value = '';
            filterProducts();
            closeMenus();
            searchInput.focus();
        });
    });

    headerMenus.forEach(menu => {
        menu.addEventListener('toggle', () => {
            if (menu.open) headerMenus.forEach(other => { if (other !== menu) other.open = false; });
        });
    });

    document.addEventListener('click', event => {
        if (!event.target.closest('.header-menu')) closeMenus();
    });

    document.addEventListener('keydown', event => {
        if (event.key !== 'Escape') return;
        const openMenu = headerMenus.find(menu => menu.open);
        if (openMenu) {
            closeMenus();
            openMenu.querySelector('summary').focus();
        }
    });

    const catalogGrid = document.querySelector('.catalog-grid');
    const catalogArrows = [...document.querySelectorAll('[data-scroll]')];

    function updateCatalogArrows() {
        const maxScroll = catalogGrid.scrollWidth - catalogGrid.clientWidth;
        catalogArrows.forEach(arrow => {
            arrow.hidden = arrow.dataset.scroll === '-1'
                ? catalogGrid.scrollLeft <= 1
                : catalogGrid.scrollLeft >= maxScroll - 1;
        });
    }

    catalogArrows.forEach(arrow => {
        arrow.addEventListener('click', () => {
            catalogGrid.scrollBy({
                left: Number(arrow.dataset.scroll) * catalogGrid.clientWidth * 0.8,
                behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'
            });
        });
    });

    catalogGrid.addEventListener('scroll', updateCatalogArrows, { passive: true });
    new ResizeObserver(updateCatalogArrows).observe(catalogGrid);
    document.querySelector('.product-menu').addEventListener('toggle', updateCatalogArrows);

}

initializeStorefront();
