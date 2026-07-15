const DEBUG_MODAL = import.meta.env.PUBLIC_DEBUG_MODAL === 'true'
const DEBUG_MODAL_FAIL = import.meta.env.PUBLIC_DEBUG_MODAL_FAIL === 'true'

export function submitForm(formId: string, successModalId: string, errorModalId: string) {
  const form = document.getElementById(formId) as HTMLFormElement | null

  form?.addEventListener('submit', (event) => {
    event.preventDefault()

    const submitPromise = DEBUG_MODAL
      ? DEBUG_MODAL_FAIL
        ? Promise.reject(new Error('Simulated form submission failure'))
        : Promise.resolve()
      : fetch('/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams(new FormData(form as HTMLFormElement) as any).toString(),
        }).then((res) => {
          if (!res.ok) throw new Error(`Form submission failed with status ${res.status}`)
          return res
        })

    submitPromise
      .then(() => {
        form?.reset()
        document.dispatchEvent(new CustomEvent(`open-modal:${successModalId}`))
      })
      .catch((error) => {
        console.error(error)
        document.dispatchEvent(new CustomEvent(`open-modal:${errorModalId}`))
      })
  })
}
