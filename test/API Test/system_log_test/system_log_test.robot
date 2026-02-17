*** Settings ***
Documentation     Test Suite for System Log (DB Verification)
Library           RequestsLibrary
Library           DatabaseLibrary
Library           Collections
Library           JSONLibrary

Suite Setup       Connect To Database    psycopg2    pnnapp_db    pnnapp_user    1234    127.0.0.1    5433
Suite Teardown    Disconnect From Database


*** Variables ***
${BASE_URL}          http://localhost:3000/api
${DRIVER_USER}       Test123
${COMMON_PASSWORD}   12345678aP


*** Test Cases ***
1. Verify SystemLog INFO Created After Successful Login
    Create Session    api_session    ${BASE_URL}

    ${login_payload}=    Create Dictionary    username=${DRIVER_USER}    password=${COMMON_PASSWORD}
    ${resp}=    POST On Session    api_session    url=/auth/login    json=${login_payload}
    Should Be Equal As Integers    ${resp.status_code}    200

    # หา log ของ login จาก method+path (บางระบบ userId ใน SystemLog อาจเป็น null)
    ${log}=    Get Latest System Log For Login

    # columns: level, method, path, statusCode, duration, userId, ipAddress, userAgent
    Should Be Equal As Strings         ${log[0]}    INFO
    Should Be Equal As Strings         ${log[1]}    POST
    Should Be Equal As Integers        ${log[3]}    200
    Should Not Be Equal As Strings     ${log[6]}    ${None}    msg=ipAddress เป็นค่าว่าง
    Should Not Be Equal As Strings     ${log[7]}    ${None}    msg=userAgent เป็นค่าว่าง


2. Verify SystemLog ERROR Created After Bad Request
    Create Session    api_session    ${BASE_URL}

    ${bad_payload}=    Create Dictionary    username=${DRIVER_USER}
    ${resp}=    POST On Session    api_session    url=/auth/login    json=${bad_payload}    expected_status=anything
    Should Be True    ${resp.status_code} >= 400

    ${log}=    Get Latest System Log By Level    ERROR
    Should Be Equal As Strings    ${log[0]}    ERROR


*** Keywords ***
Get Latest System Log For Login
    ${row}=    Get Latest System Log For Path    POST    /api/auth/login
    Run Keyword If    ${row} is None    ${row}=    Get Latest System Log For Path    POST    /auth/login
    Run Keyword If    ${row} is None    Fail    SystemLog not found for login path
    Return From Keyword    ${row}

Get Latest System Log For Path
    [Arguments]    ${method}    ${path}
    @{rows}=    Query    SELECT "level","method","path","statusCode","duration","userId","ipAddress","userAgent" FROM "SystemLog" WHERE "method"='${method}' AND "path"='${path}' ORDER BY "createdAt" DESC LIMIT 1;
    ${count}=    Get Length    ${rows}
    Run Keyword If    ${count} == 0    Return From Keyword    ${None}
    Return From Keyword    ${rows[0]}


Get Latest System Log By Level
    [Arguments]    ${level}
    @{rows}=    Query    SELECT "level","method","path","statusCode","userId" FROM "SystemLog" WHERE "level"='${level}' ORDER BY "createdAt" DESC LIMIT 1;
    Should Not Be Empty    ${rows}    msg=SystemLog not found for level=${level}
    Return From Keyword    ${rows[0]}
