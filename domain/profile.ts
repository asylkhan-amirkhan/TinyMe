export const avatarColors=['#bca9cd','#d6b89d','#a9bba2','#9eb9c5','#c9a3ae'] as const;
export function profileName(metadata?:Record<string,unknown>):string {
  const name=metadata?.display_name??metadata?.full_name;
  return typeof name==='string'?name.slice(0,40):'';
}
export function authError(error:unknown):string {
  const e=error as {code?:string;message?:string};
  const key=e?.code??e?.message??'';
  const messages:Record<string,string>={
    invalid_credentials:'Почта или пароль не подходят. Проверь данные и попробуй ещё раз.',
    email_not_confirmed:'Подтверди почту по ссылке из письма перед входом.',
    user_already_exists:'Аккаунт уже существует. Войди или восстанови пароль.',
    weak_password:'Пароль слишком простой. Добавь буквы, цифры и символы.',
    over_email_send_rate_limit:'Слишком много писем. Подожди немного и попробуй снова.',
    over_request_rate_limit:'Слишком много попыток. Попробуй немного позже.',
    email_address_invalid:'Проверь адрес электронной почты.',
    email_address_not_authorized:'Отправка писем на этот адрес пока недоступна. Нужно настроить почтовый сервис приложения.',
    signup_disabled:'Регистрация временно отключена.',
    PASSWORD_MISMATCH:'Пароли не совпадают. Проверь повтор пароля.',
    NAME_REQUIRED:'Укажи имя для профиля.',
    same_password:'Новый пароль должен отличаться от предыдущего.',
  };
  return messages[key]??'Не удалось выполнить действие. Проверь подключение и попробуй ещё раз.';
}
