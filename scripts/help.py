"""Show available shelf commands."""

from termcolor import colored


COMMANDS = [
    ("shelf-install", "Set up API venv and install all dependencies"),
    ("shelf-start", "Start API and frontend dev servers"),
    ("shelf-stop", "Stop running services by port"),
    ("shelf-test", "Run API and frontend test suites"),
    ("shelf-adduser", "Create a new user (pass password as arg or interactive)"),
    ("shelf-clean", "Remove generated and temporary files"),
    ("shelf-help", "Show this help message"),
]


def main() -> None:
    print(colored("Shelf development scripts\n", attrs=["bold"]))
    for cmd, desc in COMMANDS:
        print(f"  {colored(cmd, 'green'):30s} {desc}")
    print(f"\nSet {colored('SHELF_TEST=1', 'yellow')} in .env for test mode.")


if __name__ == "__main__":
    main()
