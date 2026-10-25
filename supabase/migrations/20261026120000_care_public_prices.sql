/*
  # Public Home Care prices

  The public Home Care page shows the price per shift. It reads this view, which
  exposes only the service name and the client price. The coordination fee that
  Voice of Preemies keeps from each shift stays inside care_services, which is
  not readable by the public.
*/

CREATE OR REPLACE VIEW care_prices_public AS
SELECT code, label, rate_per_shift FROM care_services;

REVOKE ALL ON care_prices_public FROM public;
GRANT SELECT ON care_prices_public TO anon, authenticated, service_role;
