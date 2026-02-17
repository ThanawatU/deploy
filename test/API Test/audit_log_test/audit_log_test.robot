*** Settings ***
Documentation     Test Suite for Audit Log with Username Login (Fixed Amenities & Route Payload)
Library           RequestsLibrary
Library           DatabaseLibrary
Library           Collections
Library           JSONLibrary
Library           String
Library           DateTime

# ตั้งค่า Database (ตรวจสอบ Port/Password ของคุณ)
# Database configuration (match Docker/Postgres settings)
Suite Setup       Connect To Database    psycopg2    pnnapp_db    pnnapp_user    1234    127.0.0.1    5433
Suite Teardown    Disconnect From Database

*** Variables ***
${BASE_URL}       http://localhost:3000/api
${PASSENGER_USER}        pLoomN
${PASSENGER_ID_CONST}    cmlq6xutn0001l5vvzg3hm6nx
${DRIVER_USER}           Test123
${DRIVER_ID_CONST}       cmlq83n8k003il5vv9e7ufc9l
${COMMON_PASSWORD}       12345678aP

*** Test Cases ***

1. Verify Audit Log For Driver Login
    [Tags]    Auth    Driver
    Create Session    api_session    ${BASE_URL}
    ${login_payload}=    Create Dictionary    username=${DRIVER_USER}    password=${COMMON_PASSWORD}
    ${resp}=    POST On Session    api_session    /auth/login    json=${login_payload}
    Should Be Equal As Strings    ${resp.status_code}    200
    ${token}=    Set Variable    ${resp.json()['data']['token']}
    Set Suite Variable    ${DRIVER_TOKEN}    ${token}
    
    # ตรวจสอบ Log
    ${log}=    Get Latest Audit Log    ${DRIVER_ID_CONST}    LOGIN_SUCCESS
    Should Be Equal As Strings    ${log[1]}    LOGIN_SUCCESS

2. Verify Audit Log For Passenger Login
    [Tags]    Auth    Passenger
    ${login_payload}=    Create Dictionary    username=${PASSENGER_USER}    password=${COMMON_PASSWORD}
    ${resp}=    POST On Session    api_session    /auth/login    json=${login_payload}
    Should Be Equal As Strings    ${resp.status_code}    200
    ${token}=    Set Variable    ${resp.json()['data']['token']}
    Set Suite Variable    ${PASSENGER_TOKEN}    ${token}

3. Verify Audit Log For Create Vehicle (Driver)
    [Documentation]    แก้ปัญหา Error 400 โดยการเพิ่ม field 'amenities'
    [Tags]    Vehicle    Audit
    
    ${headers}=    Create Dictionary    Authorization=Bearer ${DRIVER_TOKEN}
    ${rand_plate}=    Generate Random String    4    [NUMBERS]
    
    # [FIX] เพิ่มรายการสิ่งอำนวยความสะดวก (Amenities) เพราะ Backend บังคับ
    @{amenities_list}=    Create List    Air Conditioner    GPS
    
    ${vehicle_payload}=    Create Dictionary    
    ...    vehicleModel=Honda Civic
    ...    licensePlate=TEST-${rand_plate}
    ...    vehicleType=Sedan
    ...    color=White
    ...    seatCapacity=${4}
    ...    amenities=${amenities_list}
    
    ${resp}=    POST On Session    api_session    /vehicles    json=${vehicle_payload}    headers=${headers}
    
    # Debug: ถ้า Error ให้แสดงข้อความ
    Run Keyword If    ${resp.status_code} != 201    Log    Vehicle Error: ${resp.text}    level=ERROR
    Should Be Equal As Strings    ${resp.status_code}    201
    
    ${vehicle_id}=    Set Variable    ${resp.json()['data']['id']}
    Set Suite Variable    ${VEHICLE_ID}    ${vehicle_id}
    Log    Created Vehicle ID: ${vehicle_id}

    # ตรวจสอบ Log
    ${log}=    Get Latest Audit Log    ${DRIVER_ID_CONST}    CREATE_VEHICLE
    Should Be Equal As Strings    ${log[1]}    CREATE_VEHICLE

4. Verify Audit Log For Create Route & Booking
    [Documentation]    ทดสอบสร้าง Route และ Booking ต่อเนื่อง
    [Tags]    Route    Booking    Audit

    # --- ส่วนที่ 1: Driver สร้าง Route ---
    ${driver_headers}=    Create Dictionary    Authorization=Bearer ${DRIVER_TOKEN}
    
    ${start_loc}=    Create Dictionary    lat=${13.7563}    lng=${100.5018}    address=Bangkok
    ${end_loc}=      Create Dictionary    lat=${18.7883}    lng=${98.9853}     address=Chiang Mai
    ${dep_time}=     Get Current Date    increment=2 day    result_format=%Y-%m-%dT%H:%M:%S.000Z
    
    # [FIX] ตรวจสอบ Indentation ตรง ... ให้ตรงกัน
    ${route_payload}=    Create Dictionary
    ...    vehicleId=${VEHICLE_ID}
    ...    startLocation=${start_loc}
    ...    endLocation=${end_loc}
    ...    departureTime=${dep_time}
    ...    availableSeats=${4}
    ...    pricePerSeat=${500}
    
    # Debug: แสดง Payload ที่จะส่งไป
    Log    Sending Route Payload: ${route_payload}
    
    ${route_resp}=    POST On Session    api_session    /routes    json=${route_payload}    headers=${driver_headers}
    
    Run Keyword If    ${route_resp.status_code} != 201    Log    Route Error: ${route_resp.text}    level=ERROR
    Should Be Equal As Strings    ${route_resp.status_code}    201
    ${route_id}=    Set Variable    ${route_resp.json()['data']['id']}
    Set Suite Variable    ${ROUTE_ID}    ${route_id}
    
    # ตรวจสอบ Log Create Route
    ${log_route}=    Get Latest Audit Log    ${DRIVER_ID_CONST}    CREATE_ROUTE
    Should Be Equal As Strings    ${log_route[1]}    CREATE_ROUTE
    
    # --- ส่วนที่ 2: Passenger จอง (Booking) ---
    ${passenger_headers}=    Create Dictionary    Authorization=Bearer ${PASSENGER_TOKEN}
    ${booking_payload}=    Create Dictionary
    ...    routeId=${route_id}
    ...    numberOfSeats=${1}
    ...    pickupLocation=${start_loc}
    ...    dropoffLocation=${end_loc}

    ${book_resp}=    POST On Session    api_session    /bookings    json=${booking_payload}    headers=${passenger_headers}
    Should Be Equal As Strings    ${book_resp.status_code}    201
    ${booking_id}=    Set Variable    ${book_resp.json()['data']['id']}

    # ตรวจสอบ Log Create Booking
    ${log_booking}=    Get Latest Audit Log    ${PASSENGER_ID_CONST}    CREATE_BOOKING
    Should Be Equal As Strings    ${log_booking[1]}    CREATE_BOOKING

*** Keywords ***
Get Latest Audit Log
    [Arguments]    ${user_id}    ${action}
    @{query_result}=    Query    SELECT "userId", "action", "entity", "entityId" FROM "AuditLog" WHERE "userId" = '${user_id}' AND "action" = '${action}' ORDER BY "createdAt" DESC LIMIT 1;
    Should Not Be Empty    ${query_result}    msg=Log not found for ${action}
    RETURN    ${query_result[0]}