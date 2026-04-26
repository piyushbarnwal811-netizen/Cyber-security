import React, { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <main className="error-screen">
          <section className="login-panel">
            <h1>FraudShield AI</h1>
            <p>App load nahi ho pa raha. Browser refresh karke dobara try karein.</p>
            <pre>{this.state.error.message}</pre>
            <button onClick={() => window.location.reload()}>Reload</button>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
