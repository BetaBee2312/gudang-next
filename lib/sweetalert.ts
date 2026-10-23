import Swal, { type SweetAlertIcon, type SweetAlertOptions } from "sweetalert2";

const baseOptions: SweetAlertOptions = {
  buttonsStyling: true,
  confirmButtonText: "Mengerti",
  customClass: {
    popup: "app-swal-popup",
    title: "app-swal-title",
    confirmButton: "app-swal-confirm",
    cancelButton: "app-swal-cancel",
    denyButton: "app-swal-deny",
  },
};

export function notify(title: string, icon: SweetAlertIcon = "info", text?: string) {
  return Swal.fire({
    ...baseOptions,
    title,
    text,
    icon,
    timer: icon === "success" ? 2200 : undefined,
    showConfirmButton: icon !== "success",
  });
}

export function confirmAction(
  title: string,
  text?: string,
  options: Partial<SweetAlertOptions> = {},
) {
  return Swal.fire({
    ...baseOptions,
    title,
    text,
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Ya, lanjutkan",
    cancelButtonText: "Batal",
    confirmButtonColor: "#334155",
    reverseButtons: true,
    ...options,
  }).then((result) => result.isConfirmed);
}
