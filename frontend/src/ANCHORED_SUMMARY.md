# Anchored Summary: جوال (Mobile) Responsiveness

## Goal
- جعل جميع تبويبات الموقع تعمل بنفس الأداء على الموبايل مثل لوحة التحكم (عناصر عمودية، no overflow، touch-friendly)، والبدء بصفحة المهام.

## Constraints & Preferences
- ممنوع تغيير شكل أو تخطيط الصفحة على الكمبيوتر — أي تعديل فقط للشاشات الصغيرة (sm/mobile/tablets).
- استخدم Responsive Breakpoints في Tailwind (mobile-first: md, lg, xl).
- لا تستخدم `overflow-x: hidden` لإخفاء المشكلة.
- اختبر على 320px، 360px، 390px، 430px.

## Progress
### Done
- **في `Sidebar.jsx`**: إزالة جميع آليات الإخفاء المعتمدة على تحريك العنصر (`translateX(100%)` و `right: -100vw`). استبدالها بـ **Conditional Rendering** — عند الإغلاق على الموبايل: `return isOpen ? createPortal(sidebarContent, document.body) : null`. الـ Sidebar غير موجود في DOM بالمرة. أنيميشن الدخول عبر `animate-fade-in` (opacity فقط).
- **في `TempSupervisorPage.jsx`**: إضافة `table-responsive-cards` + `data-label` لكل `<td>` في 6 جداول (overrides, final, admin, merge, activity, mapping). إصلاح 3 مجموعات أزرار (`flex-col sm:flex-row` + `w-full sm:w-auto`).
- **في `index.css`**: الـ `table-responsive-cards` class موجود مسبقاً ويعمل عند `max-width: 767px` — يحول الجداول إلى بطاقات رأسية مع عناوين (`data-label`).
- **في جميع sub-components التابعة لصفحة المهام (11 ملف)**: تمت مراجعة وتحليل جميع الملفات وإصلاح مشاكل الجوال:

  1. **ProposalsList.jsx** — إضافة `flex-wrap` لصف البيانات الوصفية.
  2. **StageApproval.jsx** — تغيير `w-40` ← `w-full md:w-40` للتكست إيريا، إضافة `min-h-[44px]`، إضافة `break-words` للعناوين، إضافة `flex-wrap` للبيانات الوصفية.
  3. **EmployeeWorkflowTasks.jsx** — إضافة `flex-wrap` للأزرار التاب، إضافة `break-words` للعناوين، تغيير `shrink-0` ← `min-w-0` في حقل الحالة، إضافة `min-h-[44px]` للـ select، إضافة `flex-wrap` للبيانات الوصفية.
  4. **TaskHistory.jsx** — إضافة `min-h-[44px]` لزر إعادة التعيين، إضافة `break-words` للعناوين، إضافة `flex-wrap` لصف البيانات الوصفية، إضافة `flex-wrap` لصف الشارات، إضافة `min-h-[44px] min-w-[44px]` لزر الحذف.
  5. **EvaluateTasks.jsx** — إضافة `break-words` للعناوين، إضافة `flex-wrap` للبيانات الوصفية.
  6. **DepartmentTasks.jsx** — كان جاهزاً مسبقاً (`break-words`، `flex-wrap`، `min-h` موجودة).
  7. **KanbanBoard.jsx** — كان جاهزاً مسبقاً (تصميم أفقي متجاوب مع snap scrolling).
  8. **WorkflowDashboard.jsx** — كان جاهزاً مسبقاً (جدول مع `table-responsive-cards` و `data-label`).
  9. **MyTasks.jsx** — كان جاهزاً مسبقاً (لا توجد مشاكل جوال).
  10. **AddTask.jsx** — كان جاهزاً مسبقاً (لا توجد مشاكل جوال).
  11. **AssignTasks.jsx** — كان جاهزاً مسبقاً (`min-h-[44px]` في الأزرار، `flex-wrap` في خيارات الأولوية).

### In Progress
- (none)

### Blocked
- (none)

## Key Decisions
- **Conditional Rendering للـ Sidebar بدلاً من `translateX` أو `right: -100vw`**: `translateX(100%)` يزيح الـ Sidebar بمقدار عرضه فقط (288px) — عند Pinch Zoom يصبح الـ Viewport أضيق ويبقى جزء ظاهر. `right: -100vw` يعتمد على Layout Viewport ثابت لكنه لا يزال يبقي العنصر في شجرة العرض. الحل الأصح: إزالة الـ Sidebar من DOM بالكامل.
- **`table-responsive-cards` للجداول**: استراتيجية مجربة ومستخدمة في جميع صفحات Admin — تحول الجدول إلى بطاقات رأسية عند ≤ 767px، ولا تؤثر على سطح المكتب. تحتاج فقط `data-label` على كل `<td>`.
- **`flex-col sm:flex-row` للأزرار**: الأزرار المتجاورة أفقيًا تسبب overflow على الجوال. الحل: تكدس عمودي في default، أفقي في `sm:` فما فوق.
- **`break-words` للعناوين**: منع overflow النص الطويل في العناوين بلفه للسطر التالي.
- **`flex-wrap` للبيانات الوصفية**: منع overflow العناصر المتعددة (اسم الموظف، التاريخ، المدة...) في صف واحد.
- **`min-h-[44px]` للأزرار والحقول**: ضمان حجم لمس مناسب (44px minimum touch target).

## Next Steps
1. استمرار لنفس النمط في أي صفحات جديدة أو معدلة.
2. اختبار يدوي على 320px، 360px، 390px، 430px.
3. التأكد من عدم وجود overflow أفقي في أي صفحة.

## Critical Context
- **السبب الجذري لظهور Sidebar في منتصف الشاشة** (تم حله): كان `translateX(100%)` يزيح الـ Sidebar بمقدار عرضه فقط (288px)، وعند Pinch Zoom يصبح الـ Viewport أضيق ويبقى جزء من الـ Sidebar ظاهراً داخل الشاشة.
- **السبب الجذري لمشاكل الجوال في TempSupervisorPage** (تم حله): جداول بعدد أعمدة كبير (11 عمود في activity) تسبب overflow أفقي. الحل: `table-responsive-cards` يحولها لبطاقات عمودية على الجوال.
- `table-responsive-cards` CSS موجود مسبقاً في `index.css:872-911` ويستخدمه 20+ صفحة Admin.
- جميع العناصر الأب للـ Sidebar (Layout.jsx, App.jsx, etc.) لا تحتوي على transform/scale/zoom/filter.

## Relevant Files
- `frontend/src/components/layout/Sidebar.jsx`: تم تعديله — conditional rendering بدلاً من translateX/right.
- `frontend/src/pages/Admin/TempSupervisorPage.jsx`: تم تعديله — table-responsive-cards لـ 6 جداول + flex-col للأزرار.
- `frontend/src/index.css`: يحتوي على table-responsive-cards media query (max-width: 767px).
- `frontend/src/components/ProposalsList.jsx`: تم تعديله — flex-wrap للبيانات الوصفية.
- `frontend/src/pages/Workflow/StageApproval.jsx`: تم تعديله — w-full md:w-40, min-h-[44px], break-words, flex-wrap.
- `frontend/src/pages/Workflow/EmployeeWorkflowTasks.jsx`: تم تعديله — flex-wrap للأزرار التاب, break-words, min-w-0, min-h-[44px].
- `frontend/src/pages/Employee/TaskHistory.jsx`: تم تعديله — min-h-[44px], break-words, flex-wrap.
- `frontend/src/pages/Manager/EvaluateTasks.jsx`: تم تعديله — break-words, flex-wrap.
- `frontend/src/pages/Manager/DepartmentTasks.jsx`: تمت مراجعته — جاهز مسبقاً.
- `frontend/src/pages/Workflow/KanbanBoard.jsx`: تمت مراجعته — جاهز مسبقاً.
- `frontend/src/pages/Workflow/WorkflowDashboard.jsx`: تمت مراجعته — جاهز مسبقاً.
- `frontend/src/pages/Employee/MyTasks.jsx`: تمت مراجعته — جاهز مسبقاً.
- `frontend/src/pages/Employee/AddTask.jsx`: تمت مراجعته — جاهز مسبقاً.
- `frontend/src/pages/Manager/AssignTasks.jsx`: تمت مراجعته — جاهز مسبقاً.
