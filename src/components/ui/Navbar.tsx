"use client";
import styles from "./Navbar.module.css"
import SinoNotificacoes from "./SinoNotificacoes";
import { useCurrentUser } from "@/components/providers/UserProvider";
import { apiFetchClient } from "@/lib/apiClient.client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function Navbar() {

  const user = useCurrentUser();
  const router = useRouter();

  const [showMobileToolbar, setShowMobileToolbar] = useState(false);
  const [showMobileUserOptions, setShowMobileUserOptions] = useState(false);

  const handleShowMobileToolbar = () => {
    setShowMobileToolbar(prev => !prev);
  }
  const handleShowMobileUserOptions = () => {
    setShowMobileUserOptions(prev => !prev);
  }

  const hideMobileToolbars = () => {
    setShowMobileToolbar(false);
    setShowMobileUserOptions(false);
  }

  async function handleLogout() {
    await apiFetchClient("/auth/logout", { method: "POST", skipAuthRetry: true });
    router.refresh();
    router.push('/');
  }

  return (
    <nav className={styles.navbar}>
      {user ? (
        <div className={styles.linksContainer}>
          <Link href="/" className={styles.homeLink}>
            <span>
              <img src="/icons/homeIcon.svg" alt="Home" height={25} width={25} />
            </span>
          </Link>
          <div className={styles.mobileToolbar}>
            <button onClick={handleShowMobileToolbar} aria-expanded={showMobileToolbar} aria-controls="mobile-toolbar-options">
              <span>
                <img src="/icons/toolbarIcon.svg" alt="Menu" height={30} width={30} />
              </span>
            </button>
            {showMobileToolbar && (
              <div className={styles.mobileToolbarOptionsContainer} aria-hidden={!showMobileToolbar}>
                <Link href="/" className={styles.mobileToolbarLink} onClick={hideMobileToolbars}>
                  Início
                </Link>
                <Link href="/app" className={styles.mobileToolbarLink} onClick={hideMobileToolbars}>
                  Aplicativo
                </Link>
              </div>
            )}
          </div>
          <div className={styles.navTextLinks}>
            <Link href="/">Início</Link>
            <Link href="/app">Aplicativo</Link>
          </div>

          {/* CA-9 da US-016 -> o sino só existe dentro do ramo de usuário autenticado.
              Fica agrupado com o avatar: como só um dos dois containers de usuário
              aparece por vez, o sino acompanha o que estiver visível. */}
          <div className={styles.areaUsuario}>
            <SinoNotificacoes />

            <div className={styles.userContainer}>
              <span>
                <img src={user.profilePic || "/icons/profileIcon.svg"} alt="Perfil" width={30} height={30} />
              </span>
              <div className={styles.userOptionsContainer}>
                <div className={styles.userInfo}>
                  <p>{user.name}</p>
                </div>
                <div className={styles.userActions}>

                  <Link href="/profile" className={styles.userActionButton}>
                    Minha conta
                  </Link>
                  <button onClick={handleLogout} className={styles.userActionButton}>
                    Sair
                  </button>
                </div>
              </div>
            </div>

            <div className={styles.mobileUserContainer}>
              <button onClick={handleShowMobileUserOptions} aria-expanded={showMobileUserOptions} aria-controls="mobile-user-options">
                <span>
                  <img src={user.profilePic || "/icons/profileIcon.svg"} alt="Perfil" width={30} height={30} />
                </span>
              </button>
              {showMobileUserOptions && (
                <div className={styles.mobileUserOptionsContainer}>
                  <div className={styles.userInfo}>
                    <p>{user.name}</p>
                  </div>
                  <div className={styles.userActions}>
                    <Link href="/profile" className={styles.userActionButton} onClick={hideMobileToolbars}>
                      Minha conta
                    </Link>
                    <button onClick={() => { hideMobileToolbars(); handleLogout(); }} className={styles.userActionButton}>
                      Sair
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>




      ) : (
        <div className={styles.linksContainer}>
          <Link href="/">
            <span>
              <img src="/icons/homeIcon.svg" alt="Home" height={25} width={25} />
            </span>
          </Link>
          <div className={styles.navTextLinks}>
            <Link href="/">Início</Link>
            <Link href="/app">Aplicativo</Link>
          </div>
          <Link href="/login" className={styles.loginLink}>
            Login
          </Link>
        </div>
      )}

    </nav>
  )
}
