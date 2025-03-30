"use client";
import { useEffect, useState } from "react";
import {
    Grid,
    Card,
    CardMedia,
    CardContent,
    Typography,
    CardActions,
    Button,
    Box,
    Rating,
    Skeleton,
    TextField,
    Pagination
} from "@mui/material";
import { useRouter } from "next/navigation";

interface Product {
    _id: string;
    name: string;
    category: string;
    price: number;
    quantity: number;
    rating: number;
    image: string;
    description: string;
}

const ProductList = ({ refreshTrigger }: { refreshTrigger: boolean }) => {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchInput, setSearchInput] = useState("");
    const [priceFilter, setPriceFilter] = useState<string>("");
    const [page, setPage] = useState(1);
    const productsPerPage = 8; // Show 8 products per page

    const router = useRouter();

    const fetchProducts = async () => {
        try {
            setLoading(true);
            const res = await fetch("/api/products");
            const data = await res.json();
            if (data.success) {
                const validatedProducts: Product[] = data.products.map((product: Product) => ({
                    ...product,
                    price: Number(product.price) || 0,
                }));
                setProducts(validatedProducts);
            }
        } catch (error) {
            console.error("Error fetching products:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, [refreshTrigger]);

    // Filtering logic
    const filteredProducts = products.filter(product => {
        const searchMatch = product.name.toLowerCase().includes(searchInput.toLowerCase());
        const maxPrice = Number(priceFilter);
        const priceMatch = priceFilter === "" || (!isNaN(maxPrice) && product.price <= maxPrice);

        return searchMatch && priceMatch;
    });

    // Pagination logic
    const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
    const paginatedProducts = filteredProducts.slice((page - 1) * productsPerPage, page * productsPerPage);

    return (
        <Box sx={{ p: 4 }}>
            <Typography variant="h4" sx={{ textAlign: "center", mb: 4 }}>
                All Products
            </Typography>

            {/* Filter Controls */}
            <Box sx={{
                display: 'flex',
                gap: 3,
                mb: 4,
                flexDirection: { xs: 'column', sm: 'row' },
                justifyContent: 'center',
                alignItems: 'center'
            }}>
                <TextField
                    label="Search by product name"
                    variant="outlined"
                    value={searchInput}
                    onChange={(e) => {
                        setSearchInput(e.target.value);
                        setPage(1); // Reset page when search changes
                    }}
                    sx={{ width: { xs: '100%', sm: 300 } }}
                />
                <TextField
                    label="Max price"
                    type="number"
                    variant="outlined"
                    value={priceFilter}
                    onChange={(e) => {
                        setPriceFilter(e.target.value);
                        setPage(1); // Reset page when price filter changes
                    }}
                    InputProps={{ inputProps: { min: 0 } }}
                    sx={{ width: { xs: '100%', sm: 200 } }}
                />
            </Box>

            <Grid container spacing={3}>
                {loading
                    ? [...Array(8)].map((_, index) => (
                        <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
                            <Card sx={{ maxWidth: 345, boxShadow: 3 }}>
                                <Skeleton variant="rectangular" width="100%" height={200} />
                                <CardContent>
                                    <Skeleton variant="text" width="80%" height={30} animation="wave" />
                                    <Skeleton variant="text" width="60%" height={20} animation="wave" />
                                    <Skeleton variant="text" width="50%" height={20} animation="wave" />
                                    <Skeleton variant="text" width="40%" height={20} animation="wave" />
                                </CardContent>
                                <CardActions>
                                    <Skeleton variant="rectangular" width={100} height={30} animation="wave" />
                                    <Skeleton variant="rectangular" width={100} height={30} animation="wave" />
                                </CardActions>
                            </Card>
                        </Grid>
                    ))
                    : paginatedProducts.length === 0
                        ? (
                            <Grid item xs={12} sx={{
                                textAlign: 'center',
                                mt: 8,
                                minHeight: '50vh',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                alignItems: 'center'
                            }}>
                                <Typography variant="h4" color="textSecondary" gutterBottom>
                                    🕵️‍♂️ No Products Found
                                </Typography>
                                <Typography variant="body1" color="textSecondary">
                                    {priceFilter || searchInput
                                        ? "Try adjusting your filters or search terms"
                                        : "Check back later for new arrivals!"
                                    }
                                </Typography>
                            </Grid>
                        )
                        : paginatedProducts.map((product) => (
                            <Grid item xs={12} sm={6} md={4} lg={3} key={product._id}>
                                <Card sx={{ maxWidth: 345, boxShadow: 3 }}>
                                    <CardMedia
                                        component="img"
                                        height="200"
                                        image={product.image}
                                        alt={product.name}
                                        sx={{ objectFit: "cover" }}
                                    />
                                    <CardContent>
                                        <Typography gutterBottom variant="h6" component="div">
                                            {product.name}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Category: {product.category}
                                        </Typography>
                                        <Typography variant="body1" color="primary">
                                            PKR: {product.price}
                                        </Typography>
                                        <Typography
                                            variant="body2"
                                            color="text.secondary"
                                            sx={{ display: "flex", alignItems: "center", gap: 1, fontSize: "1rem" }}
                                        >
                                            <Rating value={Number(product.rating) || 0} max={5} precision={0.5} readOnly />
                                            <span style={{ fontSize: "1.1rem" }}>
                                                {(Number(product.rating) || 0).toFixed(1)}
                                            </span>
                                        </Typography>
                                    </CardContent>
                                    <CardActions>
                                        <Button size="small" color="primary" onClick={() => router.push(`/products/${product._id}`)}>
                                            View Details
                                        </Button>
                                        <Button size="small" color="secondary">
                                            Add to Cart
                                        </Button>
                                    </CardActions>
                                </Card>
                            </Grid>
                        ))}
            </Grid>

            {/* Pagination Component */}
            {totalPages > 1 && (
                <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
                    <Pagination
                        count={totalPages}
                        page={page}
                        onChange={(event, value) => setPage(value)}
                        color="primary"
                    />
                </Box>
            )}
        </Box>
    );
};

export default ProductList;
