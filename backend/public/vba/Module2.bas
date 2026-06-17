Attribute VB_Name = "Module2"
Option Explicit

' ============================================================
' Module2 - الدوال المساعدة
' - الاتصال بالخادم عبر HTTP
' - تحليل JSON
' - التحقق من صحة البيانات
' - دوال التنسيق
' ============================================================

' ------------------------------------------------
' HttpGet - إرسال طلب GET إلى الخادم
' ------------------------------------------------
Public Function HttpGet(ByVal url As String, Optional ByVal token As String = "") As String
    On Error GoTo ErrHandler
    
    Dim http As Object
    Set http = CreateObject("MSXML2.XMLHTTP")
    
    http.Open "GET", url, False
    
    ' إضافة رمز المصادقة إن وجد
    If token <> "" Then
        http.setRequestHeader "Authorization", "Bearer " & token
    End If
    
    http.setRequestHeader "Content-Type", "application/json"
    
    ' تعيين مهلة 30 ثانية
    http.setTimeouts 5000, 5000, 30000, 30000
    
    http.Send
    
    If http.Status = 200 Then
        HttpGet = http.responseText
    Else
        HttpGet = ""
        MsgBox "خطأ في الاتصال: " & http.Status & " - " & http.statusText, vbCritical, "خطأ HTTP"
    End If
    
    Set http = Nothing
    Exit Function
    
ErrHandler:
    HttpGet = ""
    MsgBox "فشل الاتصال بالخادم: " & Err.Description, vbCritical, "خطأ اتصال"
End Function

' ------------------------------------------------
' HttpPost - إرسال طلب POST إلى الخادم
' ------------------------------------------------
Public Function HttpPost(ByVal url As String, ByVal data As String, _
                         Optional ByVal token As String = "") As String
    On Error GoTo ErrHandler
    
    Dim http As Object
    Set http = CreateObject("MSXML2.XMLHTTP")
    
    http.Open "POST", url, False
    
    If token <> "" Then
        http.setRequestHeader "Authorization", "Bearer " & token
    End If
    
    http.setRequestHeader "Content-Type", "application/json"
    http.setTimeouts 5000, 5000, 60000, 60000
    
    http.Send data
    
    If http.Status = 200 Or http.Status = 201 Then
        HttpPost = http.responseText
    Else
        HttpPost = ""
    End If
    
    Set http = Nothing
    Exit Function
    
ErrHandler:
    HttpPost = ""
End Function

' ------------------------------------------------
' ParseJsonObject - تحليل JSON إلى Dictionary
' ------------------------------------------------
Public Function ParseJsonObject(ByVal jsonString As String) As Object
    On Error GoTo ErrHandler
    
    ' استخدام ScriptControl للاستفادة من JScript
    Dim sc As Object
    Set sc = CreateObject("ScriptControl")
    sc.Language = "JScript"
    
    ' إضافة دالة JScript لإرجاع كائن JSON
    Dim jsCode As String
    jsCode = "var jsonObj = " & jsonString & ";"
    jsCode = jsCode & "function getKeys(){var keys=new Array();for(var k in jsonObj){keys.push(k)};return keys.join(',')};"
    jsCode = jsCode & "function getVal(k){return typeof jsonObj[k]==='object'?JSON.stringify(jsonObj[k]):jsonObj[k]};"
    jsCode = jsCode & "function isObj(k){return typeof jsonObj[k]==='object'};"
    
    sc.AddCode jsCode
    
    ' تحويل الكائن إلى Dictionary
    Dim result As Object
    Set result = CreateObject("Scripting.Dictionary")
    
    Dim keys As String
    keys = sc.Run("getKeys")
    
    Dim keyArr As Variant
    keyArr = Split(keys, ",")
    
    Dim i As Long
    For i = 0 To UBound(keyArr)
        Dim key As String
        key = Trim(keyArr(i))
        
        If sc.Run("isObj", key) Then
            ' قيمة معقدة - نحتاج تحليل متكرر
            Dim nestedJson As String
            nestedJson = sc.Run("getVal", key)
            
            If Left(nestedJson, 1) = "[" Then
                ' مصفوفة
                Dim arrResult As Object
                Set arrResult = ParseJsonArray(nestedJson)
                result.Add key, arrResult
            ElseIf Left(nestedJson, 1) = "{" Then
                ' كائن متداخل
                Dim objResult As Object
                Set objResult = ParseJsonObject(nestedJson)
                result.Add key, objResult
            Else
                result.Add key, nestedJson
            End If
        Else
            Dim val As String
            val = sc.Run("getVal", key)
            result.Add key, val
        End If
    Next i
    
    Set ParseJsonObject = result
    Set sc = Nothing
    Exit Function
    
ErrHandler:
    ' إذا فشل ScriptControl، نحاول بطريقة بديلة
    Set ParseJsonObject = SimpleJsonParse(jsonString)
End Function

' ------------------------------------------------
' ParseJsonArray - تحليل JSON Array إلى Collection
' ------------------------------------------------
Public Function ParseJsonArray(ByVal jsonString As String) As Object
    On Error GoTo ErrHandler
    
    Dim sc As Object
    Set sc = CreateObject("ScriptControl")
    sc.Language = "JScript"
    
    Dim jsCode As String
    jsCode = "var arr = " & jsonString & ";"
    jsCode = jsCode & "function getLen(){return arr.length};"
    jsCode = jsCode & "function getItem(i){return typeof arr[i]==='object'?JSON.stringify(arr[i]):arr[i]};"
    jsCode = jsCode & "function isObj(i){return typeof arr[i]==='object'};"
    
    sc.AddCode jsCode
    
    Dim length As Long
    length = sc.Run("getLen")
    
    Dim result As Object
    Set result = CreateObject("Scripting.Dictionary")
    ' استخدام Dictionary كمصفوفة بمفاتيح رقمية
    
    Dim j As Long
    For j = 0 To length - 1
        If sc.Run("isObj", j) Then
            Dim itemJson As String
            itemJson = sc.Run("getItem", j)
            
            If Left(itemJson, 1) = "{" Then
                Dim dictItem As Object
                Set dictItem = ParseJsonObject(itemJson)
                result.Add CStr(j), dictItem
            ElseIf Left(itemJson, 1) = "[" Then
                Dim arrItem As Object
                Set arrItem = ParseJsonArray(itemJson)
                result.Add CStr(j), arrItem
            End If
        Else
            result.Add CStr(j), sc.Run("getItem", j)
        End If
    Next j
    
    Set ParseJsonArray = result
    Set sc = Nothing
    Exit Function
    
ErrHandler:
    Set ParseJsonArray = New Collection
End Function

' ------------------------------------------------
' SimpleJsonParse - تحليل JSON بسيط (حل بديل)
' ------------------------------------------------
Private Function SimpleJsonParse(ByVal jsonString As String) As Object
    Dim result As Object
    Set result = CreateObject("Scripting.Dictionary")
    result.Add "success", "false"
    result.Add "message", "تعذر تحليل البيانات. تأكد من تفعيل ScriptControl في Windows"
    Set SimpleJsonParse = result
End Function

' ------------------------------------------------
' ValidateInput - التحقق من صحة المدخلات
' ------------------------------------------------
Public Function ValidateInput(ByVal value As String, ByVal fieldName As String) As Boolean
    If Trim(value) = "" Then
        ValidateInput = False
        Exit Function
    End If
    
    ' التحقق من طول النص
    If Len(value) > 100 Then
        MsgBox "النص طويل جداً في حقل " & fieldName, vbExclamation, "تحقق"
        ValidateInput = False
        Exit Function
    End If
    
    ValidateInput = True
End Function

' ------------------------------------------------
' ValidateDate - التحقق من صحة التاريخ
' ------------------------------------------------
Public Function ValidateDate(ByVal dateStr As String) As Boolean
    If dateStr = "" Then
        ValidateDate = True ' الحقل اختياري
        Exit Function
    End If
    
    If IsDate(dateStr) Then
        ValidateDate = True
    Else
        MsgBox "تاريخ غير صحيح: " & dateStr, vbExclamation, "خطأ"
        ValidateDate = False
    End If
End Function

' ------------------------------------------------
' GetCellValue - قراءة قيمة خلية مع التحقق
' ------------------------------------------------
Public Function GetCellValue(ByVal ws As Worksheet, ByVal row As Long, _
                             ByVal col As String) As String
    Dim val As String
    val = Trim(ws.Range(col & row).Value)
    GetCellValue = val
End Function

' ------------------------------------------------
' SetupWorksheets - إعداد أوراق العمل عند فتح الملف
' ------------------------------------------------
Public Sub SetupWorksheets()
    On Error Resume Next
    
    Dim wsSearch As Worksheet
    Dim wsResults As Worksheet
    Dim wsSettings As Worksheet
    
    ' إنشاء الأوراق إذا لم تكن موجودة
    On Error Resume Next
    Set wsSearch = ThisWorkbook.Sheets(SHEET_SEARCH)
    If wsSearch Is Nothing Then
        Set wsSearch = ThisWorkbook.Sheets.Add(After:=ThisWorkbook.Sheets(ThisWorkbook.Sheets.Count))
        wsSearch.Name = SHEET_SEARCH
    End If
    
    Set wsResults = ThisWorkbook.Sheets(SHEET_RESULTS)
    If wsResults Is Nothing Then
        Set wsResults = ThisWorkbook.Sheets.Add(After:=ThisWorkbook.Sheets(ThisWorkbook.Sheets.Count))
        wsResults.Name = SHEET_RESULTS
    End If
    
    Set wsSettings = ThisWorkbook.Sheets(SHEET_SETTINGS)
    If wsSettings Is Nothing Then
        Set wsSettings = ThisWorkbook.Sheets.Add(After:=ThisWorkbook.Sheets(ThisWorkbook.Sheets.Count))
        wsSettings.Name = SHEET_SETTINGS
    End If
    
    On Error GoTo 0
    
    ' تهيئة شيت الإعدادات
    InitSettingsSheet wsSettings
    
    ' تهيئة شيت البحث
    InitSearchSheet wsSearch
    
    ' تهيئة شيت النتائج
    wsResults.Cells.Clear
    wsResults.Cells.Interior.ColorIndex = xlNone
    wsResults.Cells.Font.ColorIndex = xlAutomatic
    
    MsgBox "تم تجهيز الأوراق بنجاح", vbInformation, "تهيئة"
End Sub

' ------------------------------------------------
' InitSearchSheet - تهيئة واجهة البحث
' ------------------------------------------------
Private Sub InitSearchSheet(ByVal ws As Worksheet)
    ws.Cells.Clear
    
    ' عنوان الصفحة
    With ws.Range("A1")
        .Value = "نظام فلترة الحضور والانصراف"
        .Font.Size = 22
        .Font.Bold = True
        .Font.Color = RGB(30, 60, 110)
    End With
    ws.Range("A1:C1").Merge
    
    ws.Range("A2").Value = "أدخل معايير البحث لعرض سجلات الموظف"
    ws.Range("A2").Font.Size = 11
    ws.Range("A2").Font.Color = RGB(100, 100, 100)
    ws.Range("A2:C2").Merge
    
    ' حقول الإدخال
    Dim fields As Variant
    fields = Array( _
        Array(ROW_NAME_INPUT, "اسم الموظف:"), _
        Array(ROW_ID_INPUT, "رقم الموظف (معرف البصمة):"), _
        Array(ROW_DATE_FROM, "من تاريخ:"), _
        Array(ROW_DATE_TO, "إلى تاريخ:"), _
        Array(ROW_DEPT_INPUT, "القسم:"), _
        Array(ROW_STATUS_INPUT, "حالة الحضور:"))
    
    Dim i As Long
    For i = 0 To UBound(fields)
        Dim r As Long
        r = fields(i)(0)
        
        With ws.Range("B" & r)
            .Value = fields(i)(1)
            .Font.Bold = True
            .Font.Size = 11
            .HorizontalAlignment = xlRight
        End With
        
        With ws.Range("C" & r)
            .Interior.Color = RGB(240, 248, 255)
            .BorderAround Color:=RGB(150, 180, 210), Weight:=xlThin
        End With
    Next i
    
    ' إضافة قائمة منسدلة للحالة
    With ws.Range("C" & ROW_STATUS_INPUT).Validation
        .Delete
        .Add Type:=xlValidateList, AlertStyle:=xlValidAlertStop, _
             Formula1:="الكل,حاضر,غائب,متأخر,نصف يوم,إجازة,عمل عن بعد"
        .InCellDropdown = True
    End With
    
    ' زر البحث (كشكل)
    ws.Range("C" & ROW_BUTTON).Value = "بحث"
    ws.Range("C" & ROW_BUTTON).Font.Bold = True
    ws.Range("C" & ROW_BUTTON).Font.Color = RGB(255, 255, 255)
    ws.Range("C" & ROW_BUTTON).Interior.Color = RGB(30, 60, 110)
    ws.Range("C" & ROW_BUTTON).HorizontalAlignment = xlCenter
    
    ' عرض الأعمدة
    ws.Columns("A").ColumnWidth = 3
    ws.Columns("B").ColumnWidth = 22
    ws.Columns("C").ColumnWidth = 30
    ws.Columns("D").ColumnWidth = 3
    
    ' خلفية
    ws.Cells.Interior.Color = RGB(255, 255, 255)
    ws.Range("A1:D2").Interior.Color = RGB(230, 240, 250)
End Sub

' ------------------------------------------------
' InitSettingsSheet - تهيئة شيت الإعدادات
' ------------------------------------------------
Private Sub InitSettingsSheet(ByVal ws As Worksheet)
    ws.Cells.Clear
    
    ws.Range("A1").Value = "إعدادات الاتصال بالنظام"
    ws.Range("A1").Font.Size = 16
    ws.Range("A1").Font.Bold = True
    ws.Range("A1:C1").Merge
    
    ' حقل رابط الخادم
    ws.Range("B2").Value = "رابط الخادم (API Base URL):"
    ws.Range("B2").Font.Bold = True
    ws.Range("C2").Value = "http://127.0.0.1:3000"
    ws.Range("C2").Interior.Color = RGB(240, 248, 255)
    
    ' حقل رمز المصادقة
    ws.Range("B4").Value = "رمز المصادقة (JWT Token):"
    ws.Range("B4").Font.Bold = True
    ws.Range("C4").Value = ""
    ws.Range("C4").Interior.Color = RGB(255, 255, 230)
    
    ' ملاحظات
    ws.Range("B6").Value = "ملاحظات:"
    ws.Range("B6").Font.Bold = True
    ws.Range("B7").Value = "1. تأكد من تشغيل الخادم قبل استخدام النظام"
    ws.Range("B8").Value = "2. رابط الخادم الافتراضي للمشروع المحلي: http://127.0.0.1:3000"
    ws.Range("B9").Value = "3. يمكنك الحصول على رمز المصادقة من صفحة تسجيل الدخول"
    ws.Range("B10").Value = "4. تأكد من تفعيل مكتبة Microsoft XML (MSXML2) في References"
    
    ws.Range("B6:B10").Font.Color = RGB(80, 80, 80)
    ws.Range("B6:B10").Font.Size = 9
    
    ' عرض الأعمدة
    ws.Columns("A").ColumnWidth = 3
    ws.Columns("B").ColumnWidth = 30
    ws.Columns("C").ColumnWidth = 45
End Sub

' ------------------------------------------------
' TestConnection - اختبار الاتصال بالخادم
' ------------------------------------------------
Public Sub TestConnection()
    Dim ws As Worksheet
    Set ws = ThisWorkbook.Sheets(SHEET_SETTINGS)
    
    Dim baseUrl As String
    baseUrl = Trim(ws.Range("C2").Value)
    
    If baseUrl = "" Then
        MsgBox "الرجاء إدخال رابط الخادم", vbExclamation, "تنبيه"
        Exit Sub
    End If
    
    Dim response As String
    response = HttpGet(baseUrl & "/api/supervisor/stats", Trim(ws.Range("C4").Value))
    
    If response <> "" Then
        Dim jsonObj As Object
        Set jsonObj = ParseJsonObject(response)
        
        If Not jsonObj Is Nothing Then
            If jsonObj.Exists("success") And jsonObj("success") = "true" Then
                MsgBox "تم الاتصال بالخادم بنجاح", vbInformation, "نجاح"
            Else
                Dim msg As String
                If jsonObj.Exists("message") Then msg = jsonObj("message") Else msg = "استجابة غير متوقعة"
                MsgBox "تم الاتصال ولكن: " & msg, vbExclamation, "تنبيه"
            End If
        End If
    Else
        MsgBox "فشل الاتصال بالخادم. تحقق من الرابط.", vbCritical, "خطأ"
    End If
End Sub

' ------------------------------------------------
' AboutBox - عرض معلومات عن النظام
' ------------------------------------------------
Public Sub AboutBox()
    MsgBox "نظام فلترة الحضور v1.0" & vbCrLf & _
           "نظام متكامل لإدارة سجلات الحضور والانصراف" & vbCrLf & _
           "يعمل بالتكامل مع نظام ZKTeco Biometric" & vbCrLf & _
           "" & vbCrLf & _
           "المطور: قسم IT" & vbCrLf & _
           "التاريخ: " & Year(Date), vbInformation, "حول النظام"
End Sub
