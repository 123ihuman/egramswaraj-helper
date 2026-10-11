// aliases.js

const FIELD_ALIASES = {
  fullName: ["full name", "name", "student name", "applicant name", "candidate name"],
  firstName: ["first name", "given name"],
  lastName: ["last name", "surname", "family name"],
  fatherName: ["father name", "father's name", "fathers name", "parent name", "guardian name"],
  motherName: ["mother name", "mother's name", "mothers name"],
  dob: ["date of birth", "dob", "birth date", "birthdate"],
  gender: ["gender", "sex"],
  email: ["email", "e-mail", "email address"],
  mobile: ["mobile", "phone", "contact", "mobile number", "phone number", "contact number"],
  address: ["address", "permanent address", "current address", "residential address", "correspondence address"],
  city: ["city", "town", "district"],
  state: ["state", "province"],
  pincode: ["pincode", "pin code", "zip", "postal code", "zip code"],
  country: ["country"],
  nationality: ["nationality"],
  category: ["category", "caste", "reservation category"],
  religion: ["religion"],
  school: ["school", "college", "institution", "university"],
  rollNumber: ["roll number", "roll no", "registration number", "reg no"],
  course: ["course", "stream", "branch"],
  year: ["year", "academic year", "current year"],

  // eGramSwaraj-specific
  vendorName: ["vendor name", "payee name", "party name", "vendor", "payee"],
  amount: ["amount", "total amount", "bill amount", "payment amount", "gross amount"],
  scheme: ["scheme", "scheme name", "fund source", "grant"],
  workName: ["work name", "activity", "work", "purpose", "particulars"],
  billNo: ["bill no", "bill number", "invoice no", "voucher no"],
  accountHead: ["account head", "expenditure head", "head of account"],
  voucherDate: ["voucher date", "payment date", "date of payment", "date"],
  remarks: ["remarks", "narration", "description", "note"]
};

window.FIELD_ALIASES = FIELD_ALIASES;