type Validator<T = any> = {
  validate?: (data: T, ...args: any[]) => void | Promise<void>;
};

export function validateOrThrow<T>(
  validator: Validator<T>,
  data: T,
  ...rest: any[]
): void | Promise<void> {
  if (!validator || typeof validator.validate !== 'function') {
    return;
  }

  const result = validator.validate(data, ...rest);
  if (result instanceof Promise) {
    return result;
  }
}
