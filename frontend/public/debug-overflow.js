// ============================================================
// Debug: اكتشاف العناصر التي تسبب Horizontal Scroll
// ============================================================
// افتح Console F12 في المتصفح على الهاتف أو Desktop mode
// والصق هذا الكود واضغط Enter
// ============================================================

(function() {
  console.clear();
  console.log('%c🔍 فحص الـ Horizontal Overflow', 'font-size:20px; font-weight:bold; color:#DC2626');
  console.log(`%c📱 Viewport: ${window.innerWidth}x${window.innerHeight}`, 'font-size:14px; color:#6B7280');
  console.log(`%c📄 documentElement: ${document.documentElement.scrollWidth}x${document.documentElement.scrollHeight}`, 'font-size:14px; color:#6B7280');
  
  const diff = document.documentElement.scrollWidth - window.innerWidth;
  console.log(`%c${diff > 0 ? `❌ الفرق: ${diff}px — يوجد Horizontal Scroll!` : '✅ documentElement.scrollWidth = window.innerWidth', 'font-size:14px; font-weight:bold; color:' + (diff > 0 ? '#DC2626' : '#16A34A')}`);
  
  if (diff <= 0) {
    console.log('%c🎉 لا يوجد Horizontal Overflow على مستوى الصفحة', 'font-size:16px; color:#16A34A');
    return;
  }
  
  // فحص جميع العناصر في DOM
  const allElements = document.querySelectorAll('body *');
  const offenders = [];
  
  allElements.forEach(el => {
    if (el.offsetParent === null) return; // عناصر مخفية
    const rect = el.getBoundingClientRect();
    const scrollW = el.scrollWidth;
    const clientW = el.clientWidth;
    
    // Case 1: العنصر نفسه أوسع من الشاشة
    if (rect.width > window.innerWidth + 2) {
      offenders.push({
        element: el,
        type: 'أوسع من الشاشة',
        width: Math.round(rect.width),
        viewport: window.innerWidth,
        diff: Math.round(rect.width - window.innerWidth),
        cssPath: getElementPath(el),
        tag: el.tagName,
        id: el.id,
        className: el.className?.toString()?.substring(0, 100)
      });
    }
    
    // Case 2: محتوى العنصر أوسع من العنصر نفسه (overflow content)
    if (scrollW > clientW + 3) {
      const overflow = getComputedStyle(el).overflowX;
      if (overflow !== 'auto' && overflow !== 'scroll' && overflow !== 'hidden') {
        offenders.push({
          element: el,
          type: 'محتوى يتجاوز (بدون overflow-x:auto)',
          scrollWidth: scrollW,
          clientWidth: clientW,
          diff: scrollW - clientW,
          overflowX: overflow,
          cssPath: getElementPath(el),
          tag: el.tagName,
          id: el.id,
          className: el.className?.toString()?.substring(0, 100)
        });
      }
    }
  });
  
  // ترتيب النتائج حسب حجم المشكلة
  offenders.sort((a, b) => Math.abs(b.diff || b.width || 0) - Math.abs(a.diff || a.width || 0));
  
  console.log(`%c🚨 تم العثور على ${offenders.length} عنصر يسبب Horizontal Overflow:`, 'font-size:16px; font-weight:bold; color:#DC2626');
  
  offenders.slice(0, 20).forEach((o, i) => {
    const icon = o.type === 'أوسع من الشاشة' ? '📌' : '⚠️';
    console.group(`%c${icon} #${i + 1}: ${o.tag}${o.id ? '#' + o.id : ''}`, 'font-weight:bold');
    console.log(`المشكلة: ${o.type}`);
    console.log(`الأبعاد: ${o.width || o.scrollWidth}px (المسموح: ${o.viewport || o.clientWidth}px)`);
    console.log(`الفرق: ${o.diff}px`);
    if (o.overflowX) console.log(`overflowX: ${o.overflowX}`);
    console.log(`المسار: ${o.cssPath}`);
    if (o.className) console.log(`className: ${o.className}`);
    // Highlight في المتصفح
    if (o.element && o.element.style) {
      o.element.style.outline = '3px solid red';
      o.element.style.outlineOffset = '-3px';
    }
    console.groupEnd();
  });
  
  if (offenders.length > 20) {
    console.log(`%c... و ${offenders.length - 20} عنصر إضافي`, 'font-size:14px; color:#6B7280');
  }
  
  console.log('%c⚠️ كل عنصر مميز بـ إطار أحمر في الصفحة', 'font-size:14px; color:#DC2626');
  console.log('%c💡 استخدم $0 للاطلاع على آخر عنصر تم تسليط الضوء عليه', 'font-size:14px; color:#6B7280');
  
  function getElementPath(el) {
    const path = [];
    while (el && el !== document.body) {
      let selector = el.tagName.toLowerCase();
      if (el.id) selector += '#' + el.id;
      else if (el.className && typeof el.className === 'string') {
        const cls = el.className.trim().split(/\s+/).slice(0, 2).join('.');
        if (cls) selector += '.' + cls;
      }
      path.unshift(selector);
      el = el.parentElement;
    }
    return 'body > ' + path.join(' > ');
  }
})();
