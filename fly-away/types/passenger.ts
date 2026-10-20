export type Passenger = {
  id: string;

  booking_id: string;

  full_name: string;

  passport_no: string;

  nationality: string;

  dob: string;
};

export type PassengerForm = {
  fullName: string;
  givenName: string;
  familyName: string;
  passportNo: string;
  nationality: string;
  dob: string;
};
