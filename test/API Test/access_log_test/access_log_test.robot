*** Settings ***
Documentation     Test Suite for Access Log (DB Verification)
Library           RequestsLibrary
Library           DatabaseLibrary
Library           Collections
Library           JSONLibrary

Suite Setup       Connect To Database    psycopg2    pnnapp_db    pnnapp_user    1234    127.0.0.1    5433
Suite Teardown    Disconnect From Database


*** Variables ***
${BASE_URL}          http://localhost:3000/api
${PASSENGER_USER}    pLoomN
${COMMON_PASSWORD}   12345678aP


*** Test Cases ***
1. Verify AccessLog Created After Login
    Create Session    api_session    ${BASE_URL}

    ${login_payload}=    Create Dictionary    username=${PASSENGER_USER}    password=${COMMON_PASSWORD}
    ${resp}=    POST On Session    api_session    url=/auth/login    json=${login_payload}
    Should Be Equal As Integers    ${resp.status_code}    200

    ${json}=    Set Variable    ${resp.json()}
    ${user_id}=    Get User Id From Login Response    ${json}

    ${log}=    Get Latest Access Log By UserId    ${user_id}

    # columns: userId, loginTime, logoutTime, ipAddress, userAgent, sessionId
    Should Be Equal As Strings         ${log[0]}    ${user_id}
    Should Not Be Equal As Strings     ${log[1]}    ${None}    msg=loginTime เป็นค่าว่าง
    Should Not Be Equal As Strings     ${log[3]}    ${None}    msg=ipAddress เป็นค่าว่าง
    Should Not Be Equal As Strings     ${log[4]}    ${None}    msg=userAgent เป็นค่าว่าง


*** Keywords ***
Get Latest Access Log By UserId
    [Arguments]    ${user_id}
    # สำคัญ: ให้ SQL อยู่ "บรรทัดเดียว" เพื่อไม่ให้ DatabaseLibrary เข้าใจว่า LIMIT 1; เป็น parameters
    @{rows}=    Query    SELECT "userId","loginTime","logoutTime","ipAddress","userAgent","sessionId" FROM "AccessLog" WHERE "userId"='${user_id}' ORDER BY "createdAt" DESC LIMIT 1;
    Should Not Be Empty    ${rows}    msg=AccessLog not found for userId=${user_id}
    Return From Keyword    ${rows[0]}

Get User Id From Login Response
    [Arguments]    ${json}
    # รองรับ response หลายแบบ: data.user.id หรือ data.id
    Run Keyword If    'data' in ${json} and 'user' in ${json['data']} and 'id' in ${json['data']['user']}    Return From Keyword    ${json['data']['user']['id']}
    Run Keyword If    'data' in ${json} and 'id' in ${json['data']}    Return From Keyword    ${json['data']['id']}
    Fail    Cannot find user id in login response: ${json}
