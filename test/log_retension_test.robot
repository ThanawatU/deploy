*** Settings ***
Library           DatabaseLibrary

Suite Setup       Connect To Supabase
Suite Teardown    Disconnect From Database

*** Variables ***
${DB_NAME}        postgres
${DB_USER}        postgres
${DB_PASSWORD}    aUrzdtDD8YUxmPdx
${DB_HOST}        db.nvgcrbllnbhjxlluqmic.supabase.co
${DB_PORT}        5432

*** Test Cases ***
Check Current DB
    ${db}=    Query    SELECT current_database();
    Log To Console    DB: ${db}

Check DB Time
    ${time}=    Query    SELECT NOW();
    Log To Console    DB Time: ${time}

Check Expired Logs Count
    ${result}=    Query
    ...    SELECT COUNT(*) FROM "AuditLog"
    ...    WHERE "createdAt" < NOW() - INTERVAL '90 days';
    Log To Console    ${result}

Retention Should NOT Delete Recent Logs
    [Documentation]    Verify logs within 90 days still exist

    ${result}=    Query
    ...    SELECT COUNT(*) FROM "AuditLog"
    ...    WHERE "createdAt" >= NOW() - INTERVAL '90 days'

    ${recent_count}=    Set Variable    ${result[0][0]}
    Should Be True    ${recent_count} > 0
    Log To Console    Recent Logs Still Exist


*** Keywords ***
Connect To Supabase
    Connect To Database
    ...    psycopg2
    ...    ${DB_NAME}
    ...    ${DB_USER}
    ...    ${DB_PASSWORD}
    ...    ${DB_HOST}
    ...    ${DB_PORT}
    ...    sslmode=require