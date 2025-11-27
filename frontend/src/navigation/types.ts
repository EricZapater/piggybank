export type AuthStackParamList = {
  Login: undefined;
  Register: { invitationToken?: string; email?: string };
};

export type CoupleStackParamList = {
  CoupleStatus: undefined;
  CoupleInvite: undefined;
};

export type PiggyBankStackParamList = {
  PiggyBankList: undefined;
  PiggyBankDetail: { piggyBankId: string };
  CreatePiggyBank: undefined;
  CreateVoucherTemplate: { piggyBankId: string };
  RecordAction: { piggyBankId: string };
  History: { piggyBankId: string };
};

export type AppStackParamList = {
  Dashboard: undefined;
  PiggyBankList: undefined;
  Profile: undefined;
  CreatePiggyBank: undefined;
  PiggyBankDetail: { piggyBankId: string };
  CreateVoucherTemplate: { piggyBankId: string };
  RecordAction: { piggyBankId: string };
  History: { piggyBankId: string };
  CoupleStatus: undefined;
  CoupleInvite: undefined;
};
