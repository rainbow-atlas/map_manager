import React, { useState, useEffect } from 'react';
import {
    Box,
    Paper,
    Typography,
    List,
    ListItem,
    ListItemText,
    IconButton,
    Button,
    TextField,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Alert,
} from '@mui/material';
import {
    EditOutlined,
    DeleteOutlineOutlined,
    AddOutlined,
    CategoryOutlined,
} from '@mui/icons-material';
import { LocationService } from '../services/LocationService';

export default function CategoriesPage() {
    const [categories, setCategories] = useState<string[]>([]);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [newCategory, setNewCategory] = useState('');
    const [editingCategory, setEditingCategory] = useState({ old: '', new: '' });
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadCategories();
    }, []);

    const loadCategories = () => {
        const cats = LocationService.getCategories();
        setCategories(cats);
    };

    const handleAdd = async () => {
        if (!newCategory.trim()) {
            setError('Category name cannot be empty');
            return;
        }
        if (categories.includes(newCategory)) {
            setError('Category already exists');
            return;
        }

        try {
            await LocationService.addCategory(newCategory);
            loadCategories();
            setNewCategory('');
            setIsAddDialogOpen(false);
            setError(null);
        } catch (err) {
            setError('Failed to add category');
        }
    };

    const handleEdit = async () => {
        if (!editingCategory.new.trim()) {
            setError('Category name cannot be empty');
            return;
        }
        if (categories.includes(editingCategory.new) && editingCategory.new !== editingCategory.old) {
            setError('Category already exists');
            return;
        }

        try {
            // For now, we'll just add the new category and rely on the user to update locations manually
            await LocationService.addCategory(editingCategory.new);
            loadCategories();
            setIsEditDialogOpen(false);
            setError(null);
        } catch (err) {
            setError('Failed to edit category');
        }
    };

    const handleDelete = async (category: string) => {
        // For now, we'll just show a warning that this is not implemented
        alert('Deleting categories is not yet implemented as it requires updating all locations using this category.');
    };

    return (
        <Box>
            <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h4" component="h1">
                    Categories
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<AddOutlined />}
                    onClick={() => setIsAddDialogOpen(true)}
                >
                    Add Category
                </Button>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                </Alert>
            )}

            <Paper sx={{ mt: 2 }}>
                <List>
                    {categories.map((category) => (
                        <ListItem
                            key={category}
                            secondaryAction={
                                <Box>
                                    <IconButton
                                        edge="end"
                                        aria-label="edit"
                                        onClick={() => {
                                            setEditingCategory({ old: category, new: category });
                                            setIsEditDialogOpen(true);
                                        }}
                                    >
                                        <EditOutlined />
                                    </IconButton>
                                    <IconButton
                                        edge="end"
                                        aria-label="delete"
                                        onClick={() => handleDelete(category)}
                                    >
                                        <DeleteOutlineOutlined />
                                    </IconButton>
                                </Box>
                            }
                        >
                            <ListItemText primary={category} />
                        </ListItem>
                    ))}
                </List>
            </Paper>

            {/* Add Category Dialog */}
            <Dialog open={isAddDialogOpen} onClose={() => setIsAddDialogOpen(false)}>
                <DialogTitle>Add New Category</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Category Name"
                        fullWidth
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleAdd} variant="contained">
                        Add
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Edit Category Dialog */}
            <Dialog open={isEditDialogOpen} onClose={() => setIsEditDialogOpen(false)}>
                <DialogTitle>Edit Category</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Category Name"
                        fullWidth
                        value={editingCategory.new}
                        onChange={(e) => setEditingCategory({ ...editingCategory, new: e.target.value })}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleEdit} variant="contained">
                        Save
                    </Button>
                </DialogActions>
            </Dialog>

            <CategoryOutlined sx={{ fontSize: 40, color: 'text.secondary', mb: 2 }} />
        </Box>
    );
} 