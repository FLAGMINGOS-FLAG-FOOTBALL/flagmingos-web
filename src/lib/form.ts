const DEBUG_MODAL = import.meta.env.DEBUG_MODAL === 'false'

export function submitForm(formId: string, modalId: string) {
  const form = document.getElementById(formId) as HTMLFormElement | null

  form?.addEventListener('submit', (event) => {
    event.preventDefault()

    const submitPromise = DEBUG_MODAL
      ? Promise.resolve()
      : fetch('/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams(new FormData(form as HTMLFormElement) as any).toString(),
        })

    submitPromise
      .then(() => {
        form?.reset()
        document.dispatchEvent(new CustomEvent(`open-modal:${modalId}`))
      })
      .catch((error) => console.error(error))
  })
}
