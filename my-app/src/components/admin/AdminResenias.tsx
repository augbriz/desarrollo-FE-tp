"use client"

import { useState, useEffect, useRef } from "react"
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Rating,
  CircularProgress,
  Alert,
  Button,
  FormControl,
  Select,
  MenuItem,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Chip,
} from "@mui/material"
import {
  Delete as DeleteIcon,
  Search as SearchIcon,
  ArrowUpward as ArrowUpIcon,
  ArrowDownward as ArrowDownIcon,
} from "@mui/icons-material"
import { ThemeProvider, createTheme } from "@mui/material/styles"
import CssBaseline from "@mui/material/CssBaseline"
import NavBar from "../navBar/navBar"
import { authService } from "../../services/authService"
import { deleteReseniaAsAdmin, getAllResenasAdmin, type AdminResenia } from "../../services/reseniasService"
import ModernPagination from "../shared-components/ModernPagination"

const darkTheme = createTheme({
  palette: {
    mode: "dark",
    background: {
      default: "#141926",
      paper: "#1e2532",
    },
    primary: {
      main: "#4a90e2",
    },
    text: {
      primary: "#ffffff",
      secondary: "#b0b0b0",
    },
  },
})

// Using AdminResenia interface from reseniasService

export default function AdminResenasPage() {
  const [deleteLoading, setDeleteLoading] = useState<number | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [reviewToDelete, setReviewToDelete] = useState<number | null>(null)

  // Estados para manejar los datos
  const [resenias, setResenias] = useState<AdminResenia[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [canRetry, setCanRetry] = useState(true)

  // Estado para el filtro de fecha
  const [dateFilter, setDateFilter] = useState<string>("todas")

  const [searchQuery, setSearchQuery] = useState("")
  const [tempSearchQuery, setTempSearchQuery] = useState("")
  const [itemsPerPage, setItemsPerPage] = useState(15)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc') // Por defecto más recientes primero

  // Estados para alertas
  const [deleteAlert, setDeleteAlert] = useState(false)
  const deleteAlertRef = useRef<HTMLDivElement | null>(null)
  const errorAlertRef = useRef<HTMLDivElement | null>(null)
  // Hacer focus en la alerta de error cuando aparece
  useEffect(() => {
    if (error && errorAlertRef.current) {
      errorAlertRef.current.focus();
    }
  }, [error]);
  // Hacer focus en la alerta cuando aparece
  useEffect(() => {
    if (deleteAlert && deleteAlertRef.current) {
      deleteAlertRef.current.focus()
    }
  }, [deleteAlert])

  const [page, setPage] = useState(1)

  // Función para alternar el orden de clasificación
  const toggleSortOrder = () => {
    setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')
    setPage(1) // Reset page when changing sort
  }

  // Sincronizar tempSearchQuery con searchQuery cuando se limpia
  useEffect(() => {
    if (searchQuery === "") {
      setTempSearchQuery("")
    }
  }, [searchQuery])

  // TODO: Cargar TODAS las reseñas (función a implementar - aquí iría la llamada real al backend)
  useEffect(() => {
    const fetchAllReviews = async () => {
      try {
        const token = authService.getToken()
        if (!token) {
          setError("No estás autenticado")
          setLoading(false)
          return
        }

        // Llamada real al servicio
        const resenasData = await getAllResenasAdmin(token)
        setResenias(resenasData)
        setCanRetry(true)
      } catch (error: unknown) {
        const err = error as { status?: number }
        if (err.status === 401) {
          setError("Sesión expirada. Por favor, inicia sesión nuevamente.")
          setCanRetry(false)
        } else if (err.status === 403) {
          setError("No tienes permisos para acceder a esta información.")
          setCanRetry(false)
        } else {
          setError("Error al cargar las reseñas. Intenta nuevamente.")
          setCanRetry(true)
        }
      } finally {
        setLoading(false)
      }
    }
    fetchAllReviews()
  }, [])

  // Función para formatear fechas
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("es-ES")
  }

  // Función de filtrado y ordenamiento
  const getFilteredResenias = () => {
    const filtered = resenias.filter((resenia: AdminResenia) => {
      // Obtener nombre del producto
      const productName =
        resenia.venta.juego?.nombre ||
        resenia.venta.servicio?.nombre ||
        resenia.venta.complemento?.nombre ||
        "Producto desconocido"

      // Filtro por búsqueda de texto (incluye usuario, producto y comentario)
      const matchesSearch =
        searchQuery === "" ||
        productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        resenia.detalle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        resenia.usuario.nombre?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        resenia.usuario.nombreUsuario.toLowerCase().includes(searchQuery.toLowerCase())

      // Filtro por fecha
      let matchesDate = true
      if (dateFilter !== "todas") {
        const reseniaDate = new Date(resenia.fecha)
        const now = new Date()

        switch (dateFilter) {
          case "este-mes":
            matchesDate = reseniaDate.getMonth() === now.getMonth() && reseniaDate.getFullYear() === now.getFullYear()
            break
          case "mes-pasado": {
            const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1)
            matchesDate =
              reseniaDate.getMonth() === lastMonth.getMonth() && reseniaDate.getFullYear() === lastMonth.getFullYear()
            break
          }
          case String(new Date().getFullYear()):
            matchesDate = reseniaDate.getFullYear() === new Date().getFullYear()
            break
          case "2024":
            matchesDate = reseniaDate.getFullYear() === 2024
            break
          case "2023":
            matchesDate = reseniaDate.getFullYear() === 2023
            break
          case "2022":
            matchesDate = reseniaDate.getFullYear() === 2022
            break
          case "2021":
            matchesDate = reseniaDate.getFullYear() === 2021
            break
          case "anteriores":
            matchesDate = reseniaDate.getFullYear() <= 2020
            break
          default:
            matchesDate = true
        }
      }

      return matchesSearch && matchesDate
    })

    // Aplicar ordenamiento
    return filtered.sort((a, b) => {
      const dateA = new Date(a.fecha).getTime()
      const dateB = new Date(b.fecha).getTime()
      
      if (sortOrder === 'desc') {
        return dateB - dateA // Más recientes primero
      } else {
        return dateA - dateB // Más antiguos primero
      }
    })
  }

  const filteredResenias = getFilteredResenias()
  const totalPages = Math.max(1, Math.ceil(filteredResenias.length / itemsPerPage))
  const paginatedResenias = filteredResenias.slice((page - 1) * itemsPerPage, page * itemsPerPage)

  // Volver a la primera página al cambiar el filtro
  useEffect(() => {
    setPage(1)
  }, [searchQuery, dateFilter, resenias.length, itemsPerPage, sortOrder])

  // Extrae el nombre del producto de una venta
  const getProductName = (venta: AdminResenia["venta"]) => {
    if (venta.juego) return venta.juego.nombre
    if (venta.servicio) return venta.servicio.nombre
    if (venta.complemento) return venta.complemento.nombre
    return "Producto desconocido"
  }

  // Función para manejar la eliminación de reseñas
  const handleDeleteClick = (reseniaId: number) => {
    setReviewToDelete(reseniaId)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!reviewToDelete) return

    setDeleteLoading(reviewToDelete)
    try {
      const token = authService.getToken()
      if (!token) {
        setError("No estás autenticado")
        return
      }

      // Usar el servicio de admin para eliminar reseñas
      await deleteReseniaAsAdmin(token, reviewToDelete)

      setResenias((prev) => prev.filter((r) => r.id !== reviewToDelete))
      setDeleteAlert(true)
      setTimeout(() => setDeleteAlert(false), 4000)
      setDeleteDialogOpen(false)
      setReviewToDelete(null)
    } catch (error) {
      console.error("Error al eliminar la reseña:", error)
      setError("Error al eliminar la reseña")
    } finally {
      setDeleteLoading(null)
    }
  }

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false)
    setReviewToDelete(null)
  }

  // Función para obtener el color del chip según la puntuación
  const getRatingColor = (puntaje: number) => {
    if (puntaje >= 4) return "#4caf50" // Verde
    if (puntaje >= 3) return "#ff9800" // Naranja
    return "#f44336" // Rojo
  }

  // Mostrar loading
  if (loading) {
    return (
      <ThemeProvider theme={darkTheme}>
        <CssBaseline />
        <Box sx={{ flexGrow: 1, minHeight: "100vh", bgcolor: "background.default" }}>
          <NavBar />
          <Container
            maxWidth="lg"
            sx={{ py: 4, mt: 8, display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}
          >
            <CircularProgress size={60} />
          </Container>
        </Box>
      </ThemeProvider>
    )
  }

  // Mostrar error
  if (error) {
    return (
      <ThemeProvider theme={darkTheme}>
        <CssBaseline />
        <Box sx={{ flexGrow: 1, minHeight: "100vh", bgcolor: "background.default" }}>
          <NavBar />
          <Container maxWidth="lg" sx={{ py: 4, mt: 8 }}>
            <Alert
              severity="error"
              sx={{ width: "100%" }}
              action={
                canRetry ? (
                  <Button
                    color="inherit"
                    size="small"
                    onClick={() => {
                      setError("")
                      setLoading(true)
                      // La función fetchAllReviews se ejecutará automáticamente por el useEffect
                    }}
                  >
                    Reintentar
                  </Button>
                ) : error.includes("Sesión expirada") ? (
                  <Button
                    color="inherit"
                    size="small"
                    onClick={() => {
                      authService.logout()
                      window.location.href = "/login"
                    }}
                  >
                    Iniciar Sesión
                  </Button>
                ) : null
              }
              ref={errorAlertRef}
              tabIndex={-1}
            >
              {error}
            </Alert>
          </Container>
        </Box>
      </ThemeProvider>
    )
  }

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Box sx={{ flexGrow: 1, minHeight: "100vh", bgcolor: "background.default" }}>
        {/* NavBar compartida */}
        <NavBar />

        {/* Contenido principal */}
        <Container maxWidth="lg" sx={{ py: 4, mt: 8, px: { xs: 1, sm: 2, md: 4 } }}>
          {/* Alerta de eliminación */}
          {deleteAlert && (
            <Alert
              severity="success"
              sx={{ mb: 2, fontWeight: "bold" }}
              ref={deleteAlertRef}
              tabIndex={-1}
            >
              Reseña eliminada correctamente
            </Alert>
          )}

          {/* Mensaje de bienvenida */}
          <Box sx={{ mb: 4, textAlign: "center" }}>
            <Typography variant="h4" sx={{ color: "white", fontWeight: "bold", mb: 1 }}>
              Gestión de Reseñas
            </Typography>
            <Typography variant="h6" sx={{ color: "primary.main" }}>
              Moderar y administrar todas las reseñas de la comunidad
            </Typography>
          </Box>

          {/* Barra de búsqueda */}
          <Box sx={{ mb: 3 }}>
            <TextField
              fullWidth
              placeholder="Buscar por usuario, producto o comentario..."
              value={tempSearchQuery}
              onChange={(e) => setTempSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setSearchQuery(tempSearchQuery)
                }
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  bgcolor: "background.paper",
                  borderRadius: 3,
                },
              }}
            />
          </Box>

          {/* Título con filtro */}
          <Box sx={{ display: "flex", alignItems: "center", mb: 1, justifyContent: "space-between" }}>
            <Typography variant="h5" sx={{ color: "white", fontWeight: "bold" }}>
              Todas las Reseñas
            </Typography>

            {/* Filtro de fecha */}
            <FormControl size="small">
              <Select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                displayEmpty
                variant="outlined"
                sx={{
                  minWidth: 120,
                  height: 32,
                  backgroundColor: "#2a3441",
                  borderRadius: 3,
                  "& .MuiOutlinedInput-notchedOutline": {
                    border: "none",
                  },
                  "& .MuiSelect-select": {
                    color: "#9ca3af",
                    fontSize: "0.8rem",
                    fontWeight: 500,
                    padding: "6px 12px",
                    display: "flex",
                    alignItems: "center",
                  },
                  "& .MuiSvgIcon-root": {
                    color: "#6b7280",
                    fontSize: "1.2rem",
                  },
                  "&:hover": {
                    backgroundColor: "#374151",
                  },
                  transition: "all 0.2s ease",
                }}
                MenuProps={{
                  PaperProps: {
                    sx: {
                      backgroundColor: "#1e2532",
                      border: "1px solid #374151",
                      borderRadius: 2,
                      mt: 0.5,
                      "& .MuiMenuItem-root": {
                        color: "white",
                        fontSize: "0.875rem",
                        "&:hover": {
                          backgroundColor: "#374151",
                        },
                        "&.Mui-selected": {
                          backgroundColor: "#3a7bd5",
                          "&:hover": {
                            backgroundColor: "#2c5aa0",
                          },
                        },
                      },
                    },
                  },
                }}
              >
                <MenuItem value="todas">📅 Todas</MenuItem>
                <MenuItem value="este-mes">📅 Este mes</MenuItem>
                <MenuItem value="mes-pasado">📅 Mes pasado</MenuItem>
                <MenuItem value={String(new Date().getFullYear())}>📅 Año actual</MenuItem>
                <MenuItem value="2024">📅 2024</MenuItem>
                <MenuItem value="2023">📅 2023</MenuItem>
                <MenuItem value="2022">📅 2022</MenuItem>
                <MenuItem value="2021">📅 2021</MenuItem>
                <MenuItem value="anteriores">📅 Anteriores</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {/* Contador y selector de items por página */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 3,
              flexDirection: { xs: "column", sm: "row" },
              gap: { xs: 2, sm: 0 },
            }}
          >
            <Typography variant="body2" sx={{ color: "#6b7280" }}>
              Mostrando {filteredResenias.length} de {resenias.length} reseñas
            </Typography>

            {/* Selector de items per page */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography sx={{ color: "#6b7280", fontSize: "0.875rem" }}>Mostrar:</Typography>
              <FormControl size="small">
                <Select
                  value={itemsPerPage}
                  onChange={(e) => {
                    const newValue = Number(e.target.value)
                    setPage(1)
                    setItemsPerPage(newValue)
                  }}
                  sx={{
                    minWidth: 70,
                    height: 32,
                    backgroundColor: "#2a3441",
                    borderRadius: 2,
                    "& .MuiOutlinedInput-notchedOutline": {
                      border: "none",
                    },
                    "& .MuiSelect-select": {
                      color: "#9ca3af",
                      fontSize: "0.875rem",
                      fontWeight: 500,
                      padding: "6px 8px",
                    },
                    "& .MuiSvgIcon-root": {
                      color: "#6b7280",
                    },
                    "&:hover": {
                      backgroundColor: "#374151",
                    },
                  }}
                  MenuProps={{
                    PaperProps: {
                      sx: {
                        backgroundColor: "#1e2532",
                        border: "1px solid #374151",
                        borderRadius: 2,
                        "& .MuiMenuItem-root": {
                          color: "white",
                          fontSize: "0.875rem",
                          "&:hover": {
                            backgroundColor: "#374151",
                          },
                          "&.Mui-selected": {
                            backgroundColor: "#3a7bd5",
                            "&:hover": {
                              backgroundColor: "#2c5aa0",
                            },
                          },
                        },
                      },
                    },
                  }}
                >
                  <MenuItem value={15}>15</MenuItem>
                  <MenuItem value={30}>30</MenuItem>
                  <MenuItem value={50}>50</MenuItem>
                </Select>
              </FormControl>
            </Box>

            <Button
              variant="outlined"
                startIcon={sortOrder === 'desc' ? <ArrowDownIcon /> : <ArrowUpIcon />}
              onClick={toggleSortOrder}
              sx={{
                borderColor: "#4b5563",
                color: "white",
                "&:hover": { backgroundColor: "#374151", borderColor: "#6b7280" },
              }}
            >
                {sortOrder === 'desc' ? 'Más recientes' : 'Más antiguos'}
            </Button>
          </Box>

          {/* Lista de reseñas */}
          {filteredResenias.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 4 }}>
              <Typography variant="h6" sx={{ color: "text.secondary", mb: 2 }}>
                {resenias.length === 0 ? "No hay reseñas disponibles" : "No hay reseñas para el filtro seleccionado"}
              </Typography>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                {resenias.length === 0
                  ? "Las reseñas aparecerán aquí cuando los usuarios las publiquen"
                  : "Prueba con otro filtro de fecha"}
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {paginatedResenias.map((resenia) => (
                <Card
                  key={resenia.id}
                  sx={{
                    bgcolor: "#1e2532",
                    borderRadius: 2,
                    border: "1px solid #2a3441",
                    width: "100%",
                    boxSizing: "border-box",
                    "&:hover": {
                      borderColor: "#374151",
                    },
                    transition: "border-color 0.2s",
                  }}
                >
                  <CardContent sx={{ p: 3, width: "100%", boxSizing: "border-box" }}>
                    <Box
                      sx={{ display: "flex", alignItems: "flex-start", gap: 3, flexWrap: { xs: "wrap", md: "nowrap" } }}
                    >
                      {/* Información del usuario */}
                      <Box sx={{ minWidth: 200 }}>
                        <Typography variant="h6" sx={{ color: "primary.main", fontWeight: "bold", mb: 1 }}>
                          {resenia.usuario.nombre}
                        </Typography>
                        <Typography variant="body2" sx={{ color: "text.secondary", mb: 1 }}>
                          @{resenia.usuario.nombreUsuario}
                        </Typography>
                        <Chip
                          label={`ID: ${resenia.usuario.id}`}
                          size="small"
                          sx={{
                            bgcolor: "#2a3441",
                            color: "#9ca3af",
                            fontSize: "0.75rem",
                          }}
                        />
                      </Box>

                      {/* Información de la reseña */}
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="h6" sx={{ color: "white", fontWeight: "bold", mb: 1 }}>
                          {getProductName(resenia.venta)}
                        </Typography>

                        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1, flexWrap: "wrap" }}>
                          <Rating
                            value={resenia.puntaje}
                            readOnly
                            size="small"
                            sx={{
                              "& .MuiRating-iconFilled": {
                                color: "#ffd700",
                              },
                            }}
                          />
                          <Chip
                            label={`${resenia.puntaje} estrellas`}
                            size="small"
                            sx={{
                              bgcolor: getRatingColor(resenia.puntaje),
                              color: "white",
                              fontWeight: "bold",
                            }}
                          />
                          <Typography variant="body2" sx={{ color: "text.secondary" }}>
                            {formatDate(resenia.fecha)}
                          </Typography>
                        </Box>

                        <Typography
                          variant="body2"
                          sx={{
                            color: "text.secondary",
                            fontStyle: "italic",
                            bgcolor: "#141926",
                            p: 2,
                            borderRadius: 1,
                            border: "1px solid #2a3441",
                          }}
                        >
                          "{resenia.detalle}"
                        </Typography>
                      </Box>

                      {/* Botón de eliminar */}
                      <Button
                        variant="contained"
                        color="error"
                        size="small"
                        startIcon={deleteLoading === resenia.id ? <CircularProgress size={16} color="inherit" /> : <DeleteIcon />}
                        onClick={() => handleDeleteClick(resenia.id)}
                        disabled={deleteLoading === resenia.id}
                        sx={{
                          bgcolor: '#dc2626',
                          '&:hover': { bgcolor: '#b91c1c' },
                          textTransform: 'none',
                          minWidth: 'auto',
                        }}
                      >
                        {deleteLoading === resenia.id ? 'Eliminando...' : 'Eliminar'}
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              ))}

              {/* Paginación moderna */}
              {filteredResenias.length > 0 && (
                <ModernPagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
              )}
            </Box>
          )}
        </Container>

        {/* Dialog de confirmación de eliminación */}
        <Dialog
          open={deleteDialogOpen}
          onClose={handleDeleteCancel}
          PaperProps={{
            sx: {
              bgcolor: "#141926",
              border: "2px solid #ef4444",
              borderRadius: 3,
            },
          }}
        >
          <DialogTitle sx={{ color: "#ef4444", fontWeight: "bold" }}>
            ⚠️ Eliminar Reseña
          </DialogTitle>
          <DialogContent>
            <DialogContentText sx={{ color: "#b0b0b0" }}>
              ¿Estás seguro de que quieres eliminar esta reseña?
              <br /><br />
              Esta acción no se puede deshacer y eliminará todos los datos asociados a la reseña.
            </DialogContentText>
          </DialogContent>
          <DialogActions sx={{
            p: 3,
            gap: 2,
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { xs: 'stretch', sm: 'center' },
            width: '100%',
          }}>
            <Button 
              onClick={handleDeleteCancel}
              variant="outlined"
              sx={{
                color: "#b0b0b0",
                borderColor: "#2a3441",
                width: { xs: '100%', sm: 'auto' },
                mb: { xs: 1, sm: 0 },
                "&:hover": {
                  borderColor: "#4a90e2",
                  color: "#4a90e2",
                },
              }}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleDeleteConfirm}
              variant="contained"
              disabled={deleteLoading !== null}
              sx={{
                backgroundColor: "#ef4444",
                width: { xs: '100%', sm: 'auto' },
                mb: { xs: 1, sm: 0 },
                "&:hover": {
                  backgroundColor: "#dc2626",
                },
              }}
            >
              {deleteLoading !== null ? (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <CircularProgress size={20} color="inherit" />
                  <span>Eliminando...</span>
                </Box>
              ) : (
                "Sí, eliminar"
              )}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </ThemeProvider>
  )
}