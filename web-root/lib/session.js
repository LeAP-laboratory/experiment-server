class Session extends lab.plugins.Transmit {
  constructor(options={}) {
    options.url = options.url || 'data/';
    super(options);
  }

  // initialize information about session from server
  async init() {
    try {
      const url_params = Object.fromEntries(new URLSearchParams(document.location.search)); 
      const session = await fetch(
        "session",
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(url_params),
        });
      this.session = await session.json();
    } catch(e) {
      throw new Error("Unable to fetch session", e);
    }
    // splice session into metadata (overriding existing values)
    this.metadata = {
      ...this.metadata,
      ...this.session
    };

    // set up unload handler
    window.addEventListener('unload', () => {
      const status = this.session.status;
      if (status != "submitted" && status != "assigned") {
        this.updateStatus("abandoned");
      }
    });

    
  }

  updateStatus(status) {
    const url = `session/${this.session.session_id}/status`;
    const response = window.navigator.sendBeacon(url, status);
    console.log(`updated status to ${status}: ${response}`);
  }

  async handle(context, event) {
    switch(event) {
    case 'before:prepare':
      // add session info to the
      console.log(`before:prepare triggered on ${context}`);
      console.log("initializing Session manager");
      await this.init();
      console.log(`received session: `, this.session);
      context.parameters.session = this.session;

      // listen for status updates via datastore
      context.options.datastore.on('commit', () => {
        // Custom logic, e.g.
        if (/^status:/.test(context.state.sender)) {
          const status = context.state.sender.replace("status:", "");
          console.log(`status update: ${status}`);
          this.updateStatus(status);
        }
      });

      break;
    }

    // fall back
    super.handle(context, event);
  }
}

window.Session = Session;
