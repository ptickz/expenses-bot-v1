import { DomainError } from '../common/errors';

export class DuplicateOperationError extends DomainError {}
export class NothingToDeleteError extends DomainError {
  constructor() {
    super('Нечего отменять: операция не найдена или уже отменена');
  }
}
export class WrongPaymentReasonError extends DomainError {}
export class SameAccountCurrencyUnionError extends DomainError {
  constructor() {
    super('При обмене аккаунт не может быть тем же');
  }
}
