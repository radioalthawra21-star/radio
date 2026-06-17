Attribute VB_Name = "Module1"
Option Explicit

' ============================================================
' Module1 - الوحدة الأساسية لنظام فلترة الحضور
' نظام متكامل للبحث عن سجلات الحضور والانصراف
' ============================================================

' ثوابت أسماء الأوراق
Private Const SHEET_SEARCH As String = "واجهة البحث"
Private Const SHEET_RESULTS As String = "نتائج البحث"
Private Const SHEET_SETTINGS As String = "إعدادات"

' ثوابت الصفوف في واجهة البحث
Private Const ROW_NAME_INPUT As Long = 4
Private Const ROW_ID_INPUT As Long = 5
Private Const ROW_DATE_FROM As Long = 7
Private Const ROW_DATE_TO As Long = 8
Private Const ROW_DEPT_INPUT As Long = 10
Private Const ROW_STATUS_INPUT As Long = 12
Private Const ROW_BUTTON As Long = 14

' ------------------------------------------------
' Sub MainSearch - نقطة الدخول الرئيسية للبحث
' ------------------------------------------------
Public Sub MainSearch()
    On Error GoTo ErrHandler
    
    Dim wsSearch As Worksheet
    Dim wsResults As Worksheet
    Dim wsSettings As Worksheet
    
    Set wsSearch = ThisWorkbook.Sheets(SHEET_SEARCH)
    Set wsResults = ThisWorkbook.Sheets(SHEET_RESULTS)
    Set wsSettings = ThisWorkbook.Sheets(SHEET_SETTINGS)
    
    ' تعطيل تحديث الشاشة للسرعة
    Application.ScreenUpdating = False
    Application.DisplayAlerts = False
    
    ' قراءة المدخلات
    Dim empName As String
    Dim empId As String
    Dim dateFrom As String
    Dim dateTo As String
    Dim department As String
    Dim statusFilter As String
    
    empName = Trim(wsSearch.Range("C" & ROW_NAME_INPUT).Value)
    empId = Trim(wsSearch.Range("C" & ROW_ID_INPUT).Value)
    dateFrom = Trim(wsSearch.Range("C" & ROW_DATE_FROM).Value)
    dateTo = Trim(wsSearch.Range("C" & ROW_DATE_TO).Value)
    department = Trim(wsSearch.Range("C" & ROW_DEPT_INPUT).Value)
    statusFilter = Trim(wsSearch.Range("C" & ROW_STATUS_INPUT).Value)
    
    ' التحقق من صحة المدخلات
    If empName = "" And empId = "" Then
        MsgBox "الرجاء إدخال اسم الموظف أو رقمه الوظيفي", vbExclamation, "تنبيه"
        GoTo CleanUp
    End If
    
    ' الاتصال بالخادم
    Dim baseUrl As String
    Dim token As String
    
    baseUrl = Trim(wsSettings.Range("C2").Value)
    token = Trim(wsSettings.Range("C4").Value)
    
    If baseUrl = "" Then
        MsgBox "الرجاء ضبط إعدادات الاتصال في شيت الإعدادات", vbExclamation, "خطأ"
        GoTo CleanUp
    End If
    
    ' بناء رابط API
    Dim apiUrl As String
    apiUrl = baseUrl & "/api/supervisor/final-attendance?"
    
    If empName <> "" Then
        ' نحتاج employeeId وليس الاسم - نستخدم البحث أولاً
        ' سنرسل الاسم كـ deviceUserName
    End If
    
    If dateFrom <> "" Then apiUrl = apiUrl & "startDate=" & dateFrom & "&"
    If dateTo <> "" Then apiUrl = apiUrl & "endDate=" & dateTo & "&"
    
    ' جلب البيانات
    Dim jsonResponse As String
    jsonResponse = HttpGet(apiUrl, token)
    
    If jsonResponse = "" Then
        MsgBox "فشل الاتصال بالخادم. تحقق من الإعدادات.", vbCritical, "خطأ اتصال"
        GoTo CleanUp
    End If
    
    ' تحليل JSON
    Dim jsonData As Object
    Set jsonData = ParseJsonObject(jsonResponse)
    
    If jsonData Is Nothing Then
        MsgBox "خطأ في تحليل البيانات المستلمة", vbCritical, "خطأ"
        GoTo CleanUp
    End If
    
    If Not jsonData.Exists("success") Or jsonData("success") <> True Then
        Dim errMsg As String
        If jsonData.Exists("message") Then errMsg = jsonData("message") Else errMsg = "استجابة غير متوقعة"
        MsgBox errMsg, vbCritical, "خطأ في الخادم"
        GoTo CleanUp
    End If
    
    ' استخراج البيانات
    Dim records As Object
    Set records = jsonData("data")
    
    If records Is Nothing Or records.Count = 0 Then
        MsgBox "لا توجد سجلات تطابق معايير البحث", vbInformation, "نتيجة البحث"
        GoTo CleanUp
    End If
    
    ' عرض النتائج
    DisplayResults records, empName
    GenerateSummary wsResults, records
    
    ' تنسيق الجدول
    FormatResultsTable wsResults, records.Count
    
    MsgBox "تم العثور على " & records.Count & " سجل", vbInformation, "نتيجة البحث"
    
CleanUp:
    Application.ScreenUpdating = True
    Application.DisplayAlerts = True
    Exit Sub
    
ErrHandler:
    MsgBox "حدث خطأ: " & Err.Description, vbCritical, "خطأ غير متوقع"
    Resume CleanUp
End Sub

' ------------------------------------------------
' Sub DisplayResults - عرض النتائج في شيت النتائج
' ------------------------------------------------
Private Sub DisplayResults(ByVal records As Object, ByVal empName As String)
    Dim ws As Worksheet
    Set ws = ThisWorkbook.Sheets(SHEET_RESULTS)
    
    ' مسح المحتوى السابق
    ws.Cells.Clear
    ws.Rows.RowHeight = 15
    
    ' عنوان التقرير
    With ws.Range("A1")
        .Value = "تقرير الحضور والانصراف"
        .Font.Size = 18
        .Font.Bold = True
        .Font.Color = RGB(30, 60, 110)
    End With
    
    If empName <> "" Then
        ws.Range("A2").Value = "الموظف: " & empName
        ws.Range("A2").Font.Size = 12
    End If
    
    ws.Range("A3").Value = "تاريخ التقرير: " & Date
    ws.Range("A3").Font.Size = 10
    ws.Range("A3").Font.Color = RGB(100, 100, 100)
    
    ' رؤوس الأعمدة (الصف 5)
    Dim headers As Variant
    headers = Array("#", "الموظف", "القسم", "معرف البصمة", _
                    "التاريخ", "أول دخول", "آخر خروج", _
                    "المدة (س)", "الحالة", "إضافي (س)")
    
    Dim i As Long
    For i = 0 To 9
        With ws.Cells(5, i + 1)
            .Value = headers(i)
            .Font.Bold = True
            .Font.Color = RGB(255, 255, 255)
            .Interior.Color = RGB(30, 60, 110)
            .HorizontalAlignment = xlCenter
            .VerticalAlignment = xlCenter
        End With
    Next i
    
    ws.Rows(5).RowHeight = 25
    
    ' تعيين اتجاه RTL للنطاق
    ws.Range("A5:J5").ReadingOrder = xlRTL
    
    ' عرض البيانات (من الصف 6)
    Dim rowNum As Long
    rowNum = 6
    
    Dim j As Long
    For j = 0 To records.Count - 1
        Dim rec As Object
        Set rec = records(j)
        
        ws.Cells(rowNum, 1).Value = j + 1
        
        ' اسم الموظف
        Dim empObj As Object
        If TypeName(rec("employee")) = "Dictionary" Then
            Set empObj = rec("employee")
            ws.Cells(rowNum, 2).Value = empObj("name")
            ws.Cells(rowNum, 3).Value = empObj("department")
            
            If empObj.Exists("zkUserId") Then
                ws.Cells(rowNum, 4).Value = empObj("zkUserId")
            End If
        Else
            ws.Cells(rowNum, 2).Value = "غير معروف"
            ws.Cells(rowNum, 3).Value = "-"
        End If
        
        ' التاريخ
        Dim rawDate As String
        rawDate = rec("date")
        If rawDate <> "" Then
            ws.Cells(rowNum, 5).Value = FormatDateTime(rawDate, vbShortDate)
        End If
        
        ' وقت الدخول
        Dim checkInObj As Object
        If TypeName(rec("checkIn")) = "Dictionary" Then
            Set checkInObj = rec("checkIn")
            If checkInObj.Exists("time") Then
                Dim inTime As String
                inTime = checkInObj("time")
                If inTime <> "" Then ws.Cells(rowNum, 6).Value = FormatDateTime(inTime, vbShortTime)
            End If
        End If
        
        ' وقت الخروج
        Dim checkOutObj As Object
        If TypeName(rec("checkOut")) = "Dictionary" Then
            Set checkOutObj = rec("checkOut")
            If checkOutObj.Exists("time") Then
                Dim outTime As String
                outTime = checkOutObj("time")
                If outTime <> "" Then ws.Cells(rowNum, 7).Value = FormatDateTime(outTime, vbShortTime)
            End If
        End If
        
        ' المدة
        If rec.Exists("duration") Then
            ws.Cells(rowNum, 8).Value = rec("duration")
        End If
        
        ' الحالة
        Dim status As String
        If rec.Exists("status") Then status = rec("status") Else status = ""
        
        Select Case status
            Case "present": ws.Cells(rowNum, 9).Value = "حاضر"
            Case "absent":  ws.Cells(rowNum, 9).Value = "غائب"
            Case "late":    ws.Cells(rowNum, 9).Value = "متأخر"
            Case "half_day": ws.Cells(rowNum, 9).Value = "نصف يوم"
            Case "on_leave": ws.Cells(rowNum, 9).Value = "إجازة"
            Case "work_from_home": ws.Cells(rowNum, 9).Value = "عمل عن بعد"
            Case Else:      ws.Cells(rowNum, 9).Value = status
        End Select
        
        ' إضافي
        If rec.Exists("overtime") Then
            ws.Cells(rowNum, 10).Value = rec("overtime")
        End If
        
        ' تنسيق الصف حسب الحالة
        Select Case status
            Case "late", "absent"
                ws.Rows(rowNum).Interior.Color = RGB(255, 230, 230)
                ws.Rows(rowNum).Font.Color = RGB(180, 0, 0)
            Case "present"
                ws.Rows(rowNum).Interior.Color = RGB(230, 255, 230)
            Case Else
                ws.Rows(rowNum).Interior.Color = RGB(245, 245, 245)
        End Select
        
        ws.Rows(rowNum).RowHeight = 20
        rowNum = rowNum + 1
    Next j
    
    ' تعيين عرض الأعمدة
    ws.Columns("A").ColumnWidth = 5
    ws.Columns("B").ColumnWidth = 22
    ws.Columns("C").ColumnWidth = 15
    ws.Columns("D").ColumnWidth = 14
    ws.Columns("E").ColumnWidth = 14
    ws.Columns("F").ColumnWidth = 12
    ws.Columns("G").ColumnWidth = 12
    ws.Columns("H").ColumnWidth = 10
    ws.Columns("I").ColumnWidth = 14
    ws.Columns("J").ColumnWidth = 10
    
    ' تفعيل التصفية التلقائية
    Dim lastRow As Long
    lastRow = rowNum - 1
    If lastRow >= 6 Then
        ws.Range("A5:J" & lastRow).AutoFilter
    End If
    
    ' إضافة حدود للجدول
    With ws.Range("A5:J" & lastRow).Borders
        .LineStyle = xlContinuous
        .Color = RGB(180, 180, 180)
        .Weight = xlThin
    End With
End Sub

' ------------------------------------------------
' Sub GenerateSummary - حساب وعرض الملخص
' ------------------------------------------------
Private Sub GenerateSummary(ByVal ws As Worksheet, ByVal records As Object)
    Dim totalDays As Long
    Dim presentDays As Long
    Dim absentDays As Long
    Dim lateDays As Long
    Dim totalOvertime As Double
    Dim totalDuration As Double
    
    totalDays = records.Count
    
    Dim i As Long
    For i = 0 To records.Count - 1
        Dim rec As Object
        Set rec = records(i)
        
        Dim status As String
        If rec.Exists("status") Then status = rec("status") Else status = ""
        
        Select Case status
            Case "present", ""
                presentDays = presentDays + 1
            Case "absent"
                absentDays = absentDays + 1
            Case "late"
                lateDays = lateDays + 1
                presentDays = presentDays + 1
            Case "half_day"
                presentDays = presentDays + 1
            Case Else
                presentDays = presentDays + 1
        End Select
        
        If rec.Exists("overtime") Then
            If IsNumeric(rec("overtime")) Then
                totalOvertime = totalOvertime + CDbl(rec("overtime"))
            End If
        End If
        
        If rec.Exists("duration") Then
            If IsNumeric(rec("duration")) Then
                totalDuration = totalDuration + CDbl(rec("duration"))
            End If
        End If
    Next i
    
    Dim summaryRow As Long
    summaryRow = 2 + IIf(ws.Range("A2").Value <> "", 2, 1)
    summaryRow = summaryRow + 1 ' بعد الملخص
    
    ' إدراج الملخص فوق الجدول
    ws.Range("E1").Value = "الملخص"
    ws.Range("E1").Font.Bold = True
    ws.Range("E1").Font.Size = 14
    
    ws.Range("E2").Value = "إجمالي الأيام:"
    ws.Range("F2").Value = totalDays
    ws.Range("E3").Value = "أيام الحضور:"
    ws.Range("F3").Value = presentDays
    ws.Range("E4").Value = "أيام الغياب:"
    ws.Range("F4").Value = absentDays
    ws.Range("E5").Value = "أيام التأخير:"
    ws.Range("F5").Value = lateDays
    ws.Range("E6").Value = "إجمالي ساعات العمل:"
    ws.Range("F6").Value = Round(totalDuration, 1)
    ws.Range("E7").Value = "إجمالي ساعات الإضافي:"
    ws.Range("F7").Value = Round(totalOvertime, 1)
    
    ws.Range("E2:E7").Font.Bold = True
    ws.Range("E2:E7").HorizontalAlignment = xlRight
End Sub

' ------------------------------------------------
' Sub ClearAll - مسح جميع البيانات
' ------------------------------------------------
Public Sub ClearAll()
    Dim ws As Worksheet
    Set ws = ThisWorkbook.Sheets(SHEET_RESULTS)
    ws.Cells.Clear
    ws.Cells.ColumnWidth = 10
    
    ws = ThisWorkbook.Sheets(SHEET_SEARCH)
    ws.Range("C4:C5").ClearContents
    ws.Range("C7:C8").ClearContents
    ws.Range("C10").ClearContents
    ws.Range("C12").ClearContents
    
    MsgBox "تم مسح جميع البيانات", vbInformation, "تم"
End Sub

' ------------------------------------------------
' Sub ExportToPDF - تصدير التقرير إلى PDF
' ------------------------------------------------
Public Sub ExportToPDF()
    On Error GoTo ErrHandler
    
    Dim ws As Worksheet
    Set ws = ThisWorkbook.Sheets(SHEET_RESULTS)
    
    ' التحقق من وجود بيانات
    If ws.Cells(6, 1).Value = "" Then
        MsgBox "لا توجد نتائج للتصدير. قم بالبحث أولاً.", vbExclamation, "تنبيه"
        Exit Sub
    End If
    
    Dim savePath As String
    savePath = ThisWorkbook.Path & "\تقرير_الحضور_" & Format(Now, "yyyy-mm-dd_hh-mm") & ".pdf"
    
    ws.ExportAsFixedFormat Type:=xlTypePDF, Filename:=savePath, _
        Quality:=xlQualityStandard, IncludeDocProperties:=True, _
        IgnorePrintAreas:=False, OpenAfterPublish:=True
    
    MsgBox "تم تصدير التقرير بنجاح", vbInformation, "تم"
    Exit Sub
    
ErrHandler:
    MsgBox "خطأ في التصدير: " & Err.Description, vbCritical, "خطأ"
End Sub

' ------------------------------------------------
' Sub RefreshData - تحديث البيانات
' ------------------------------------------------
Public Sub RefreshData()
    Call MainSearch
End Sub
