export class Auth {
  static token = "";
  static userId = 0;

  static login(token, userId) {
    this.token = token;
    this.userId = userId;
  }

  static getHeaders() {
    return { Authorization: `Bearer ${this.token}` };
  }

  static isLogin() {
    return !!this.token;
  }
}