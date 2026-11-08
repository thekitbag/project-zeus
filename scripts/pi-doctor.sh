#!/usr/bin/env bash
# Checks each layer between the phone and the app, in order, on the Pi.
# Usage: ./scripts/pi-doctor.sh [tailnet-domain]
# The first FAIL is usually the root cause; later failures tend to follow from it.

set -u

PORT=3000
CERT_WARN_DAYS=20
failures=0

pass() { printf '  \033[32mPASS\033[0m  %s\n' "$1"; }
warn() { printf '  \033[33mWARN\033[0m  %s\n' "$1"; }
fail() {
  printf '  \033[31mFAIL\033[0m  %s\n' "$1"
  printf '        fix: %s\n' "$2"
  failures=$((failures + 1))
}

domain="${1:-$(tailscale status --json 2>/dev/null \
  | python3 -c 'import json,sys; print((json.load(sys.stdin).get("CertDomains") or [""])[0])' 2>/dev/null)}"

echo "Project Zeus doctor — ${domain:-<no tailnet domain found>}"

# 1. DNS. Without it, Tailscale can't renew the Let's Encrypt cert.
if getent hosts acme-v02.api.letsencrypt.org >/dev/null; then
  pass "DNS resolves public names"
else
  fail "DNS can't resolve acme-v02.api.letsencrypt.org (resolv.conf: $(grep -c '^nameserver' /etc/resolv.conf) nameservers)" \
    "sudo nmcli con mod \"<wlan0 connection>\" ipv4.dns \"1.1.1.1 8.8.8.8\" ipv4.ignore-auto-dns yes && sudo nmcli con up \"<wlan0 connection>\""
fi

# 2. Container.
container="$(docker ps --filter "publish=$PORT" --format '{{.Names}}' 2>/dev/null)"
if [ -n "$container" ]; then
  pass "container running ($container)"
else
  fail "no running container publishes port $PORT" "docker compose up -d --build (or check: docker compose logs zeus)"
fi

# 3. App over plain HTTP on the Pi itself.
code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "http://localhost:$PORT")"
if [ "$code" -ge 200 ] && [ "$code" -lt 400 ]; then
  pass "app responds on http://localhost:$PORT ($code)"
else
  fail "app not responding on http://localhost:$PORT (got $code)" "docker compose logs --tail 50 zeus"
fi

# 4. Tailscale up and serving HTTPS.
if [ -z "$domain" ]; then
  fail "Tailscale not connected or MagicDNS/HTTPS certs disabled" \
    "sudo tailscale up; enable MagicDNS + HTTPS Certificates in the admin console (DNS page)"
elif tailscale serve status 2>/dev/null | grep -q "https://$domain"; then
  pass "tailscale serve proxies https://$domain"
else
  fail "tailscale serve has no HTTPS config" "sudo tailscale serve reset && sudo tailscale serve --bg $PORT"
fi

# 5. Certificate actually served, and how long it has left.
if [ -n "$domain" ]; then
  enddate="$(echo | timeout 15 openssl s_client -connect "$domain:443" -servername "$domain" 2>/dev/null \
    | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)"
  if [ -z "$enddate" ]; then
    fail "no valid TLS cert on https://$domain (this is the phone's 'invalid response')" \
      "fix any FAIL above, then: sudo tailscale cert $domain"
  else
    days=$(( ($(date -d "$enddate" +%s) - $(date +%s)) / 86400 ))
    if [ "$days" -lt "$CERT_WARN_DAYS" ]; then
      warn "cert expires in $days days — renewal may be failing (check DNS above, then: sudo tailscale cert $domain)"
    else
      pass "cert valid for $days more days"
    fi
  fi
fi

echo
if [ "$failures" -eq 0 ]; then
  echo "All good. Phone URL: https://$domain"
else
  echo "$failures check(s) failed."
  exit 1
fi
