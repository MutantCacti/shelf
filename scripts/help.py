"""Show available shelf commands."""

from termcolor import colored


COMMANDS = [
    ("shelf-install", "Set up API venv, npm install, Playwright browsers, and dev user"),
    ("shelf-start", "Start API and frontend dev servers"),
    ("shelf-stop", "Stop running services by port"),
    ("shelf-test", "Run all tests (api + frontend + e2e)"),
    ("shelf-test --help", "See shelf-test usage (for testing only one service or in headed mode)"),
    ("shelf-adduser", "Create a new user (pass password as arg or interactive)"),
    ("shelf-clean", "Remove all generated files (preserves root .venv)"),
    ("shelf-https", "Set up HTTPS certificates using mkcert"),
    ("shelf-help", "Show this help message"),
]


def main() -> None:
    print(colored("Shelf development scripts\n", attrs=["bold"]))
    for cmd, desc in COMMANDS:
        print(f"  {colored(cmd, 'green'):28s} {desc}")
    print(f"\nSet {colored('SHELF_TEST=1', 'yellow')} in .env for test mode (ports 9000/9001, password: test).")


if __name__ == "__main__":
    main()
