*** Settings ***
Library           RequestsLibrary
Library           DatabaseLibrary
Library           Collections
Library           JSONLibrary

Suite Setup       Connect To Database    psycopg2    pnnapp_db    pnnapp_user    1234    127.0.0.1    5433
Suite Teardown    Disconnect From Database

*** Variables ***
${BASE_URL}       http://localhost:3000/api
${ADMIN_EMAIL}    admin@example.com
${ADMIN_PASSWORD}    123456789

*** Test Cases ***
Verify Data Integrity Of Audit Log
    [Documentation]    Verify Data Integrity Of Audit Log
    
    Create Session    auth_session    ${BASE_URL}

    # 1. ยิง API Login และเก็บข้อมูลจาก Response
    ${login_payload}=    Create Dictionary    email=${ADMIN_EMAIL}    password=${ADMIN_PASSWORD}
    ${resp}=    POST On Session    auth_session    /auth/login    json=${login_payload}
    
    # ดึงข้อมูลจาก API Response เพื่อใช้เทียบกับ DB (เข้าถึง data > user > id)
    ${api_user_id}=    Set Variable    ${resp.json()['data']['user']['id']}
    
    # 2. Query ข้อมูลจาก AuditLog โดยระบุเงื่อนไขที่เจาะจงขึ้น
    # ดึงข้อมูลออกมา 6 columns เพื่อตรวจสอบความถูกต้องทั้งหมด
    @{log}=    Query    SELECT "userId", "role", "action", "entityId", "ipAddress", "userAgent" FROM "AuditLog" WHERE "action" = 'LOGIN_SUCCESS' AND "userId" = '${api_user_id}' ORDER BY "createdAt" DESC LIMIT 1;
    
    # 3. ตรวจสอบความถูกต้อง (Data Integrity Assertion)
    Should Not Be Empty    ${log}    msg=ไม่พบ Audit Log ที่ระบุ userId ตรงกับผู้ใช้งาน
    
    # 0. ตรวจสอบว่า userId ใน Log ตรงกับ User ที่ Login จริง
    Should Be Equal As Strings    ${log[0][0]}    ${api_user_id}
    
    # 1. ตรวจสอบว่า Role ถูกต้องตามสิทธิ์ (ADMIN)
    Should Be Equal As Strings    ${log[0][1]}    ADMIN
    
    # 2. ตรวจสอบว่า action ถูกต้อง
    Should Be Equal As Strings    ${log[0][2]}    LOGIN_SUCCESS
    
    # 3. ตรวจสอบว่า entityId ตรงกับ userId (ในกรณี Login)
    Should Be Equal As Strings    ${log[0][3]}    ${api_user_id}
    
    # 4-5. ตรวจสอบว่ามีการบันทึก Context ของ Request (ไม่เป็น null)
    Should Not Be Equal As Strings    ${log[0][4]}    ${None}    msg=ipAddress ใน Log เป็นค่าว่าง
    Should Not Be Equal As Strings    ${log[0][5]}    ${None}    msg=userAgent ใน Log เป็นค่าว่าง

    Log To Console    \n[PASSED] Audit Log Integrity Verified for User ID: ${api_user_id}