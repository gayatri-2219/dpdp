DPDP_SECTIONS = {
    'section_4': {'title': 'Grounds for processing personal data', 'description': 'Processing allowed only for lawful purposes with consent or legitimate use.'},
    'section_5': {'title': 'Notice', 'description': 'Provide itemized notice about personal data processing to the Data Principal.'},
    'section_6': {'title': 'Consent', 'description': 'Consent must be free, specific, informed, unconditional, and unambiguous.'},
    'section_7': {'title': 'Certain legitimate uses', 'description': 'Processing without consent for defined legitimate uses like medical emergencies.'},
    'section_8': {'title': 'General obligations of Data Fiduciary', 'description': 'Ensure accuracy, security, and deletion when purpose is served.'},
    'section_9': {'title': 'Processing of personal data of children', 'description': 'Requires verifiable parental consent.'},
    'section_10': {'title': 'Additional obligations of significant data fiduciary', 'description': 'DPO appointment, DPIA, and audits.'},
    'section_11': {'title': 'Rights of Data Principal', 'description': 'Right to access, correct, erase, and grievance redressal.'},
    'section_16': {'title': 'Transfer of personal data outside India', 'description': 'Subject to government restrictions.'},
}

PII_SENSITIVITY = {
    'AADHAAR': 'CRITICAL',
    'PAN': 'HIGH',
    'CREDIT_CARD': 'CRITICAL',
    'PASSPORT': 'HIGH',
    'PHONE_NUMBER': 'MEDIUM',
    'EMAIL_ADDRESS': 'MEDIUM',
    'PERSON': 'LOW',
    'ORGANIZATION': 'LOW',
    'DATE_OF_BIRTH': 'HIGH',
    'IFSC': 'HIGH',
    'UPI': 'HIGH',
}
