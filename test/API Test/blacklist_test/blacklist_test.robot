*** Settings ***
Library           RequestsLibrary
Library           Collections

Suite Setup       Setup Admin Session

*** Variables ***
${BASE_URL}              http://localhost:3000
${SESSION_ALIAS}         admin_api
${ADMIN_USER}            admin123
${ADMIN_PASS}            123456789
${TARGET_USER_ID}        cmlqa1n7g008wl5vv6x8gh58q

*** Test Cases ***
Complete Blacklist Lifecycle Workflow
    [Documentation]    Create -> Get All -> Get By ID -> Lift -> Add Evidence

    # 1) Create Blacklist (ต้องใช้ suspendDays เป็น number)
    ${suspend_days}=    Evaluate    7
    ${body}=    Create Dictionary
    ...    userId=${TARGET_USER_ID}
    ...    type=PASSENGER
    ...    reason=Test
    ...    suspendDays=${suspend_days}

    ${resp_create}=    POST On Session    ${SESSION_ALIAS}    url=/api/blacklists/admin    json=${body}    expected_status=anything
    Should Be Equal As Integers    ${resp_create.status_code}    201

    ${created_id}=    Get Blacklist Id From Response    ${resp_create.json()}
    Set Suite Variable    ${CREATED_BLACKLIST_ID}    ${created_id}

    # 2) GET All (ตาม router ต้องเป็น /admin)
    ${resp_all}=    GET On Session    ${SESSION_ALIAS}    url=/api/blacklists/admin    expected_status=anything
    Should Be Equal As Integers    ${resp_all.status_code}    200

    ${all_ids}=    Evaluate    [item['id'] for item in $resp_all.json()]
    List Should Contain Value    ${all_ids}    ${CREATED_BLACKLIST_ID}

    # 3) GET by ID (router คือ /admin/:id)
    ${resp_one}=    GET On Session    ${SESSION_ALIAS}    url=/api/blacklists/admin/${CREATED_BLACKLIST_ID}    expected_status=anything
    Should Be Equal As Integers    ${resp_one.status_code}    200
    Should Be Equal As Strings    ${resp_one.json()['userId']}    ${TARGET_USER_ID}

    # 4) Lift (router คือ /admin/:id/lift)
    ${resp_lift}=    PATCH On Session    ${SESSION_ALIAS}    url=/api/blacklists/admin/${CREATED_BLACKLIST_ID}/lift    expected_status=anything
    Should Be Equal As Integers    ${resp_lift.status_code}    200

    # 5) Add Evidence (router คือ /admin/:id/evidence)
    ${evidence_body}=    Create Dictionary    type=IMAGE    url=https://www.youtube.com/watch?v=dQw4w9WgXcQ
    ${resp_evidence}=    POST On Session    ${SESSION_ALIAS}    url=/api/blacklists/admin/${CREATED_BLACKLIST_ID}/evidence    json=${evidence_body}    expected_status=anything
    Should Be Equal As Integers    ${resp_evidence.status_code}    201


*** Keywords ***
Setup Admin Session
    Create Session    ${SESSION_ALIAS}    ${BASE_URL}    disable_warnings=1
    ${login_payload}=    Create Dictionary    username=${ADMIN_USER}    password=${ADMIN_PASS}

    ${resp}=    POST On Session    ${SESSION_ALIAS}    url=/api/auth/login    json=${login_payload}    expected_status=anything
    Should Be Equal As Integers    ${resp.status_code}    200

    ${token}=    Set Variable    ${resp.json()['data']['token']}
    Should Not Be Empty    ${token}
    ${auth_header}=    Create Dictionary    Authorization=Bearer ${token}
    Update Session    ${SESSION_ALIAS}    headers=${auth_header}

Get Blacklist Id From Response
    [Arguments]    ${json}

    Run Keyword If    'id' in ${json}    Return From Keyword    ${json['id']}
    Run Keyword If    'data' in ${json} and 'id' in ${json['data']}    Return From Keyword    ${json['data']['id']}
    Run Keyword If    'data' in ${json} and 'blacklist' in ${json['data']} and 'id' in ${json['data']['blacklist']}    Return From Keyword    ${json['data']['blacklist']['id']}

    Fail    Cannot find blacklist id in response: ${json}