"""Show available shelf commands."""

from termcolor import colored


COMMANDS = [
    ("shelf-install", "Set up API venv, npm install, and create dev user"),
    ("shelf-start", "Start API and frontend dev servers"),
    ("shelf-stop", "Stop running services by port"),
    ("shelf-test", "Run all tests (unit + e2e)"),
    ("shelf-test unit", "Run API and frontend unit tests only"),
    ("shelf-test e2e", "Start test services and run Playwright e2e tests"),
    ("shelf-test e2e --headed", "Run e2e tests with a visible browser"),
    ("shelf-adduser", "Create a new user (pass password as arg or interactive)"),
    ("shelf-clean", "Remove all generated files (preserves root .venv)"),
    ("shelf-help", "Show this help message"),
]


def main() -> None:
    print(colored("Shelf development scripts\n", attrs=["bold"]))
    for cmd, desc in COMMANDS:
        print(f"  {colored(cmd, 'green'):30s} {desc}")
    print(f"\nSet {colored('SHELF_TEST=1', 'yellow')} in .env for test mode (ports 9000/9001, password: test).")


if __name__ == "__main__":
    main()
