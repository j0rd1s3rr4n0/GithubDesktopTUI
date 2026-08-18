Contributing
============

Thanks for wanting to contribute! Please follow the project guidelines and open issues or PRs for significant changes.

Installer note
--------------
For users on Windows we strongly recommend running the installer inside WSL (Ubuntu) or another POSIX shell. Running the one-line installer (`curl ... | bash`) from PowerShell/CMD can cause CRLF line-ending issues and permission errors. If you must run from Windows, convert `autoinstall.sh` to LF first (e.g., `dos2unix autoinstall.sh`) and run it from WSL.

If you encounter problems, open an issue with your OS, shell, `node --version`, and the exact error output.
