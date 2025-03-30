"use client";

import { useEffect, useState } from "react";
import { Grid, Card, CardMedia, CardContent, Typography, Box, Skeleton, Rating, CardActions, Button } from "@mui/material";
import { useRouter } from "next/navigation";

interface Product {
    _id: string;
    name: string;
    price: number;
    rating: number;
    image: string;
}

export default function TopRatedProducts({ refreshTrigger }: { refreshTrigger: boolean }) {
    const [products, setProducts] = useState<Product[] | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const fetchTopProducts = async () => {
            try {
                const response = await fetch("/api/products/top-rated");
                const data = await response.json();

                // ✅ Ensure sorting is only applied after data fetch
                const sortedProducts = data.sort((a: Product, b: Product) => b.rating - a.rating);
                setProducts(sortedProducts);
            } catch (error) {
                console.error("Error fetching top-rated products:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchTopProducts();
    }, [refreshTrigger]);

    return (
        <Box sx={{ p: 4 }}>
            <Typography variant="h4" sx={{ textAlign: "center", mb: 4 }}>
                Top Rated Products
            </Typography>

            <Grid container spacing={3}>
                {loading
                    ? [...Array(4)].map((_, index) => (
                        <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
                            <Card sx={{ maxWidth: 345, boxShadow: 3 }}>
                                <Skeleton variant="rectangular" width="100%" height={200} />
                                <CardContent>
                                    <Skeleton variant="text" width="80%" height={30} />
                                    <Skeleton variant="text" width="60%" height={20} />
                                    <Skeleton variant="text" width="40%" height={20} />
                                </CardContent>
                                <CardActions>
                                    <Skeleton variant="rectangular" width={100} height={30} />
                                </CardActions>
                            </Card>
                        </Grid>
                    ))
                    : products && products.length > 0
                        ? products.map((product) => (
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
                                        <Typography variant="body1" color="primary">
                                            {typeof product.price === "number" ? product.price.toFixed(1) : "N/A"}
                                        </Typography>
                                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1 }}>
                                            <Rating value={product.rating} precision={0.5} readOnly />
                                            <Typography variant="body2">
                                                Rating: ⭐ {typeof product.rating === "number" ? product.rating.toFixed(1) : "N/A"}
                                            </Typography>
                                        </Box>
                                    </CardContent>
                                    <CardActions>
                                        <Button
                                            size="small"
                                            color="primary"
                                            onClick={() => router.push(`/products/${product._id}`)}
                                        >
                                            View Details
                                        </Button>
                                    </CardActions>
                                </Card>
                            </Grid>
                        ))
                        : (
                            <Typography variant="body1" sx={{ textAlign: "center", mt: 2 }}>
                                No products found.
                            </Typography>
                        )}
            </Grid>
        </Box>
    );
}
