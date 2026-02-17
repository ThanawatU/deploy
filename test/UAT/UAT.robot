*** Settings ***
Library    SeleniumLibrary
Test Teardown    Close Browser

*** Variables ***
${CHROME_DRIVER_PATH}      C:${/}Program Files${/}ChromeForTesting${/}chromedriver-win64${/}chromedriver.exe
${CHROME_BROWSER_PATH}     C:${/}Program Files${/}ChromeForTesting${/}chrome-win64${/}chrome.exe

${BASE_URL}                http://localhost:3003/
${ADMIN_USER}              admin123
${ADMIN_PASS}              123456789
${BAN_FULLNAME}            efsef sefsefsef
${BAN_USERNAME}            Test1234
${BAN_REASON}              test
${BAN_DAYS}                5



*** Keywords ***
Open Chrome
    ${opts}=    Evaluate    sys.modules['selenium.webdriver'].ChromeOptions()    sys
    Evaluate    setattr($opts, "binary_location", r"""${CHROME_BROWSER_PATH}""")
    Call Method    ${opts}    add_argument    --start-maximized
    Call Method    ${opts}    add_argument    --disable-notifications

    ${svc}=     Evaluate    sys.modules["selenium.webdriver.chrome.service"].Service(executable_path=r"${CHROME_DRIVER_PATH}")
    Create Webdriver    Chrome    options=${opts}    service=${svc}
    Set Selenium Speed  0

Go To Login Page
    Go To    ${BASE_URL}
    Wait Until Element Is Visible    xpath=//a[@href='/login']    10s
    Click Element    xpath=//a[@href='/login']
    Wait Until Element Is Visible    id=loginForm    10s

Login As Admin And Go Dashboard
    Wait Until Element Is Visible    id=identifier    10s
    Input Text        id=identifier    ${ADMIN_USER}
    Input Password    id=password      ${ADMIN_PASS}
    Click Button      xpath=//form[@id='loginForm']//button[@type='submit']
    Wait Until Element Is Visible
    ...    xpath=//div[contains(@class,'dropdown-trigger')]    15s

    Go To    ${BASE_URL}admin/users
    Wait Until Location Contains    /admin/users    10s


Open Monitor Page
    Go To    ${BASE_URL}admin/monitor
    Wait Until Location Contains    /admin/monitor    10s

Verify AuditLog
    Wait Until Element Is Visible    xpath=//h2[contains(.,'AuditLog')]    10s
    Page Should Contain Element      xpath=//table
    Page Should Contain Element      xpath=//th[contains(.,'Time')]
    Page Should Contain Element      xpath=//th[contains(.,'User')]
    Page Should Contain Element      xpath=//th[contains(.,'Action')]
    Page Should Contain Element      xpath=//th[contains(.,'Target')]

Verify Home Page
    Location Should Be    ${BASE_URL}
    Page Should Contain Element    xpath=//a[@href='/login']

Verify Login Page And Form
    Location Should Contain    /login
    Page Should Contain Element    id=loginForm
    Page Should Contain Element    id=identifier
    Page Should Contain Element    id=password

Verify Admin Logged In And On Dashboard
    Location Should Contain    /admin/users
    Page Should Contain Element    xpath=//a[@href='/admin/monitor']
    Page Should Contain Element    xpath=//a[@href='/admin/users']

Verify Monitor Tabs Exist
    Location Should Contain    /admin/monitor
    Page Should Contain Element    xpath=//button[contains(.,'AuditLog')]
    Page Should Contain Element    xpath=//button[contains(.,'SystemLog')]
    Page Should Contain Element    xpath=//button[contains(.,'AccessLog')]

Verify AuditLog Header
    Wait Until Element Is Visible    xpath=//h2[contains(.,'AuditLog')]    10s
    Page Should Contain    AuditLog (ล่าสุด 100 รายการ)

Verify AuditLog Columns
    Page Should Contain Element      xpath=//th[contains(.,'Time')]
    Page Should Contain Element      xpath=//th[contains(.,'User')]
    Page Should Contain Element      xpath=//th[contains(.,'Action')]
    Page Should Contain Element      xpath=//th[contains(.,'Target')]

Verify AuditLog Has At Least 1 Row
    Wait Until Element Is Visible    xpath=//table//tbody/tr    10s
    Page Should Contain Element      xpath=//table//tbody/tr[1]

Verify SystemLog
    Execute Javascript
    ...    document.querySelectorAll('nav.flex.space-x-6 button')[1].click()

    # รอ tab active
    Wait Until Page Contains Element
    ...    xpath=//button[contains(@class,'border-b-2') and normalize-space()='SystemLog']
    ...    10s

    Wait Until Element Is Visible    xpath=//h2[contains(.,'SystemLog')]    10s

    Page Should Contain Element    xpath=//th[normalize-space()='Time']
    Page Should Contain Element    xpath=//th[normalize-space()='Method']
    Page Should Contain Element    xpath=//th[normalize-space()='Endpoint']
    Page Should Contain Element    xpath=//th[normalize-space()='Status']
    Page Should Contain Element    xpath=//th[normalize-space()='Response']
    Page Should Contain Element    xpath=//th[normalize-space()='Level']


Verify SystemLog Header
    Click Element    xpath=//button[normalize-space()='SystemLog']
    Wait Until Element Is Visible
    ...    xpath=//button[normalize-space()='SystemLog' and contains(@class,'border-b-2')]
    ...    10s
    Wait Until Element Is Visible    xpath=//h2[contains(.,'SystemLog')]    10s
    Page Should Contain    SystemLog


Verify SystemLog Columns
    Click Tab And Wait Active    SystemLog

    Wait Until Element Is Visible    xpath=//th[normalize-space()='Method']    10s

    Page Should Contain Element    xpath=//th[normalize-space()='Time']
    Page Should Contain Element    xpath=//th[normalize-space()='Method']
    Page Should Contain Element    xpath=//th[normalize-space()='Endpoint']
    Page Should Contain Element    xpath=//th[normalize-space()='Status']
    Page Should Contain Element    xpath=//th[normalize-space()='Response']
    Page Should Contain Element    xpath=//th[normalize-space()='Level']



Verify SystemLog Has At Least 1 Row
    Wait Until Element Is Visible    xpath=//table//tbody/tr    10s
    Page Should Contain Element      xpath=//table//tbody/tr[1]


Verify AccessLog
    Execute Javascript
    ...    document.querySelectorAll('nav.flex.space-x-6 button')[2].click()

    Wait Until Page Contains Element
    ...    xpath=//button[contains(@class,'border-b-2') and normalize-space()='AccessLog']
    ...    10s

    Wait Until Element Is Visible    xpath=//h2[contains(.,'AccessLog')]    10s

    Page Should Contain Element    xpath=//th[normalize-space()='Time']
    Page Should Contain Element    xpath=//th[normalize-space()='User']
    Page Should Contain Element    xpath=//th[normalize-space()='Activity']
    Page Should Contain Element    xpath=//th[normalize-space()='IP Address']


Verify AccessLog Header
    Click Element    xpath=//button[normalize-space()='AccessLog']
    Wait Until Element Is Visible
    ...    xpath=//button[normalize-space()='AccessLog' and contains(@class,'border-b-2')]
    ...    10s
    Wait Until Element Is Visible    xpath=//h2[contains(.,'AccessLog')]    10s
    Page Should Contain    AccessLog


Verify AccessLog Columns
    Click Tab And Wait Active    AccessLog

    Wait Until Element Is Visible
    ...    xpath=//th[normalize-space()='Activity']
    ...    10s

    Page Should Contain Element    xpath=//th[normalize-space()='Time']
    Page Should Contain Element    xpath=//th[normalize-space()='User']
    Page Should Contain Element    xpath=//th[normalize-space()='Activity']
    Page Should Contain Element    xpath=//th[normalize-space()='IP Address']



Verify AccessLog Has At Least 1 Row
    Wait Until Element Is Visible    xpath=//table//tbody/tr    10s
    Page Should Contain Element      xpath=//table//tbody/tr[1]

Click Tab And Wait Active
    [Arguments]    ${tab_name}
    ${btn}=    Get WebElement    xpath=//nav[contains(@class,'flex') and contains(@class,'space-x')]/button[normalize-space()='${tab_name}']
    Execute Javascript    arguments[0].scrollIntoView({block:'center'});    ARGUMENTS    ${btn}
    Sleep    0.2s
    Execute Javascript    arguments[0].click();    ARGUMENTS    ${btn}

    # รอให้แท็บนั้น active จริง
    Wait Until Element Is Visible
    ...    xpath=//nav[contains(@class,'flex') and contains(@class,'space-x')]/button[normalize-space()='${tab_name}' and contains(@class,'border-b-2')]
    ...    10s

Open Blacklist Management Page
    Go To    ${BASE_URL}admin/blacklists
    Wait Until Location Contains    /admin/blacklists    10s
    Page Should Contain    Blacklist Management
Click Add Blacklisted User Button
    # เข้า create page ตรง ๆ (ไม่กดปุ่ม ไม่รอ redirect)
    Go To    ${BASE_URL}admin/blacklists/create

    Wait Until Location Contains    /admin/blacklists/create    10s

    # รอ form โหลด
    Wait Until Element Is Visible
    ...    xpath=//h1[contains(.,'เพิ่มผู้ใช้ที่ถูกแบน')]
    ...    10s


Fill Ban Form
    # ===== Search User =====
    ${search}=    Get WebElement
    ...    xpath=//label[contains(.,'ค้นหาผู้ใช้')]/following::input[1]

    Click Element    ${search}
    Clear Element Text    ${search}
    Input Text    ${search}    t

    # รอ dropdown option โชว์ แล้วคลิก option ที่มี "@Test1234"
    Wait Until Element Is Visible
    ...    xpath=//button[@type='button' and contains(@class,'hover:bg-blue-50') and contains(.,'@${BAN_USERNAME}')]
    ...    10s
    Click Element
    ...    xpath=//button[@type='button' and contains(@class,'hover:bg-blue-50') and contains(.,'@${BAN_USERNAME}')]

    # ===== Reason =====
    Input Text
    ...    xpath=//label[normalize-space()='Reason *']/following::input[1]
    ...    ${BAN_REASON}

    # ===== Days =====
    Input Text
    ...    xpath=//label[contains(.,'ระยะเวลาการแบน')]/following::input[1]
    ...    ${BAN_DAYS}

Submit Ban Form
    Wait Until Element Is Visible    xpath=//button[normalize-space()='บันทึก']    10s
    Click Button    xpath=//button[normalize-space()='บันทึก']
    Wait Until Location Contains    /admin/blacklists    10s

Verify User Appears In Blacklist Table
    Wait Until Page Contains
    ...    เพิ่ม Blacklist สำเร็จ
    ...    10s

    Page Should Contain    เพิ่ม Blacklist สำเร็จ

Verify User Is Inactive On Users Page
    Wait Until Page Contains    Inactive    10s
    Page Should Contain         Inactive


Unban User By Toggling Active Switch
    # รอ table โหลด
    Wait Until Element Is Visible    xpath=//table    10s

    # หา row แรกที่เป็น Inactive
    Wait Until Element Is Visible
    ...    xpath=(//tr[.//*[normalize-space()='Inactive']])[1]
    ...    10s

    # กด switch
    Click Element
    ...    xpath=(//tr[.//*[normalize-space()='Inactive']])[1]//label[contains(@class,'switch')]

    # รอ toast success
    Wait Until Page Contains
    ...    เปิดใช้งานบัญชีสำเร็จ
    ...    10s

    Page Should Contain    เปิดใช้งานบัญชีสำเร็จ



Verify User Is Active
    Wait Until Page Contains    Active    10s
    Page Should Contain         Active

Open User Management Page
    Go To    ${BASE_URL}admin/users
    Wait Until Location Contains    /admin/users    10s
    Wait Until Element Is Visible    xpath=//table    10s


*** Test Cases ***
# No.1
UAT-PNN-001-STEP-001 Open Home Page
    Open Chrome
    Go To    ${BASE_URL}
    Verify Home Page

# No.2
UAT-PNN-001-STEP-002 Click Login And See Login Form
    Open Chrome
    Go To    ${BASE_URL}
    Click Element    xpath=//a[@href='/login']
    Wait Until Element Is Visible    id=loginForm    10s
    Verify Login Page And Form

# No.3
UAT-PNN-001-STEP-003 Admin Login And Go Dashboard
    Open Chrome
    Go To Login Page
    Login As Admin And Go Dashboard
    Verify Admin Logged In And On Dashboard

# No.4
UAT-PNN-001-STEP-004 Open Monitor And See Tabs
    Open Chrome
    Go To Login Page
    Login As Admin And Go Dashboard
    Open Monitor Page
    Verify Monitor Tabs Exist

# No.5
UAT-PNN-001-STEP-005 Verify AuditLog Header And Active Tab
    Open Chrome
    Go To Login Page
    Login As Admin And Go Dashboard
    Open Monitor Page
    Verify AuditLog Header

# No.6
UAT-PNN-001-STEP-006 Verify AuditLog Table Columns
    Open Chrome
    Go To Login Page
    Login As Admin And Go Dashboard
    Open Monitor Page
    Verify AuditLog Columns

# No.7
UAT-PNN-001-STEP-007 Verify AuditLog Data Exists
    Open Chrome
    Go To Login Page
    Login As Admin And Go Dashboard
    Open Monitor Page
    Verify AuditLog Has At Least 1 Row

# (ตัวเดิมแบบรวมทุกอย่าง)
UAT-PNN-001 Admin View Audit Log
    Open Chrome
    Go To Login Page
    Login As Admin And Go Dashboard
    Open Monitor Page
    Verify AuditLog
    Verify AuditLog Has At Least 1 Row

# ---------------------------
# UAT-PNN-002 System Log Steps
# ---------------------------

UAT-PNN-002-STEP-001 Open Home Page
    Open Chrome
    Go To    ${BASE_URL}
    Verify Home Page

UAT-PNN-002-STEP-002 Click Login And See Login Form
    Open Chrome
    Go To    ${BASE_URL}
    Click Element    xpath=//a[@href='/login']
    Wait Until Element Is Visible    id=loginForm    10s
    Verify Login Page And Form

UAT-PNN-002-STEP-003 Admin Login And Go Dashboard
    Open Chrome
    Go To Login Page
    Login As Admin And Go Dashboard
    Verify Admin Logged In And On Dashboard

UAT-PNN-002-STEP-004 Open Monitor And See Tabs
    Open Chrome
    Go To Login Page
    Login As Admin And Go Dashboard
    Open Monitor Page
    Verify Monitor Tabs Exist

UAT-PNN-002-STEP-005 Verify SystemLog Header
    Open Chrome
    Go To Login Page
    Login As Admin And Go Dashboard
    Open Monitor Page
    Verify SystemLog Header

UAT-PNN-002-STEP-006 Verify SystemLog Table Columns
    Open Chrome
    Go To Login Page
    Login As Admin And Go Dashboard
    Open Monitor Page
    Sleep    3s
    Verify SystemLog Columns

UAT-PNN-002-STEP-007 Verify SystemLog Data Exists
    Open Chrome
    Go To Login Page
    Login As Admin And Go Dashboard
    Open Monitor Page
    Verify SystemLog Has At Least 1 Row

UAT-PNN-002 Admin View System Log
    Open Chrome
    Go To Login Page
    Login As Admin And Go Dashboard
    Open Monitor Page
    Verify SystemLog
    Verify SystemLog Has At Least 1 Row


# ---------------------------
# UAT-PNN-003 Access Log Steps
# ---------------------------

UAT-PNN-003-STEP-001 Open Home Page
    Open Chrome
    Go To    ${BASE_URL}
    Verify Home Page

UAT-PNN-003-STEP-002 Click Login And See Login Form
    Open Chrome
    Go To    ${BASE_URL}
    Click Element    xpath=//a[@href='/login']
    Wait Until Element Is Visible    id=loginForm    10s
    Verify Login Page And Form

UAT-PNN-003-STEP-003 Admin Login And Go Dashboard
    Open Chrome
    Go To Login Page
    Login As Admin And Go Dashboard
    Verify Admin Logged In And On Dashboard

UAT-PNN-003-STEP-004 Open Monitor And See Tabs
    Open Chrome
    Go To Login Page
    Login As Admin And Go Dashboard
    Open Monitor Page
    Verify Monitor Tabs Exist

UAT-PNN-003-STEP-005 Verify AccessLog Header
    Open Chrome
    Go To Login Page
    Login As Admin And Go Dashboard
    Open Monitor Page
    Verify AccessLog Header

UAT-PNN-003-STEP-006 Verify AccessLog Table Columns
    Open Chrome
    Go To Login Page
    Login As Admin And Go Dashboard
    Open Monitor Page
    Sleep    3s
    Verify AccessLog Columns

UAT-PNN-003-STEP-007 Verify AccessLog Data Exists
    Open Chrome
    Go To Login Page
    Login As Admin And Go Dashboard
    Open Monitor Page
    Verify AccessLog Has At Least 1 Row

UAT-PNN-003 Admin View Access Log
    Open Chrome
    Go To Login Page
    Login As Admin And Go Dashboard
    Open Monitor Page
    Verify AccessLog
    Verify AccessLog Has At Least 1 Row

# ---------------------------
# UAT-PNN-004 Ban User Steps
# ---------------------------

UAT-PNN-004-STEP-001 Open Home Page
    Open Chrome
    Go To    ${BASE_URL}
    Verify Home Page

UAT-PNN-004-STEP-002 Click Login And See Login Form
    Open Chrome
    Go To    ${BASE_URL}
    Click Element    xpath=//a[@href='/login']
    Wait Until Element Is Visible    id=loginForm    10s
    Verify Login Page And Form

UAT-PNN-004-STEP-003 Admin Login And Go Dashboard
    Open Chrome
    Go To Login Page
    Login As Admin And Go Dashboard
    Verify Admin Logged In And On Dashboard

UAT-PNN-004-STEP-004 Open Blacklist Management Page
    Open Chrome
    Go To Login Page
    Login As Admin And Go Dashboard
    Open Blacklist Management Page

UAT-PNN-004-STEP-005 Open Add Ban Form
    Open Chrome
    Go To Login Page
    Login As Admin And Go Dashboard
    Open Blacklist Management Page
    Click Add Blacklisted User Button

UAT-PNN-004-STEP-006 Fill Ban Form
    Open Chrome
    Go To Login Page
    Login As Admin And Go Dashboard
    Open Blacklist Management Page
    Click Add Blacklisted User Button
    Fill Ban Form

UAT-PNN-004-STEP-007 Submit And Verify Ban Result
    Open Chrome
    Go To Login Page
    Login As Admin And Go Dashboard
    Open Blacklist Management Page
    Click Add Blacklisted User Button
    Fill Ban Form
    Submit Ban Form
    Verify User Appears In Blacklist Table
    Open User Management Page
    Verify User Is Inactive On Users Page

UAT-PNN-004 Admin Ban User
    Open Chrome
    Go To Login Page
    Login As Admin And Go Dashboard
    Open Blacklist Management Page
    Click Add Blacklisted User Button
    Fill Ban Form
    Submit Ban Form
    Verify User Appears In Blacklist Table
    Open User Management Page
    Verify User Is Inactive On Users Page
```

# ---------------------------
# UAT-PNN-005 Unban User via Active Switch (/admin/users)
# ---------------------------

UAT-PNN-005-STEP-001 Open Home Page
    Open Chrome
    Go To    ${BASE_URL}
    Verify Home Page

UAT-PNN-005-STEP-002 Click Login And See Login Form
    Open Chrome
    Go To    ${BASE_URL}
    Click Element    xpath=//a[@href='/login']
    Wait Until Element Is Visible    id=loginForm    10s
    Verify Login Page And Form

UAT-PNN-005-STEP-003 Admin Login And Go Dashboard
    Open Chrome
    Go To Login Page
    Login As Admin And Go Dashboard
    Verify Admin Logged In And On Dashboard

UAT-PNN-005-STEP-004 Open User Management Page
    Open Chrome
    Go To Login Page
    Login As Admin And Go Dashboard
    Open User Management Page
    Wait Until Element Is Visible    xpath=//table    10s

UAT-PNN-005-STEP-005 Toggle Active To Unban User
    Open Chrome
    Go To Login Page
    Login As Admin And Go Dashboard
    Open User Management Page
    Unban User By Toggling Active Switch


UAT-PNN-005-STEP-006 Verify User Is Active
    Open Chrome
    Go To Login Page
    Login As Admin And Go Dashboard
    Open User Management Page
    Unban User By Toggling Active Switch
    Verify User Is Active


UAT-PNN-005-STEP-007 Verify User Can Be Seen As Active On Users Page
    Open Chrome
    Go To Login Page
    Login As Admin And Go Dashboard
    Open User Management Page
    Verify User Is Active


UAT-PNN-005 Admin Unban User (Toggle Active)
    Open Chrome
    Go To Login Page
    Login As Admin And Go Dashboard
    Open User Management Page
    Unban User By Toggling Active Switch
    Verify User Is Active
