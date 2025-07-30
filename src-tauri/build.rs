#[allow(unused)]
fn set_env(name: &str, value: &str) {
    println!("cargo:warning=[set_env] {} = {}", name, value);
    println!("cargo:rustc-env={}={}", name, value);
}

fn main() {
    #[cfg(not(debug_assertions))]
    {
        set_env("ORT_LIB_LOCATION", "./lib");

        #[cfg(target_os = "windows")]
        {
            set_env("RUSTFLAGS", "-Ctarget-feature=+crt-static");
        }
        #[cfg(target_os = "macos")]
        {
            set_env("RUSTFLAGS", "-Ctarget-feature=+crt-static");
        }
        #[cfg(target_os = "linux")]
        {
            set_env("RUSTFLAGS", "-Ctarget-feature=+crt-static");
        }
    }

    #[cfg(debug_assertions)]
    {
        set_env("RUSTFLAGS", "-Clink-arg=-fuse-ld=lld");
    }

    tauri_build::build()
}
