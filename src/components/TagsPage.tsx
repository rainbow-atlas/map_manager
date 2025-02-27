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
    Chip,
} from '@mui/material';
import {
    EditOutlined,
    DeleteOutlineOutlined,
    AddOutlined,
    LocalOfferOutlined,
} from '@mui/icons-material';
import { LocationService } from '../services/LocationService';

export default function TagsPage() {
    const [tags, setTags] = useState<string[]>([]);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [newTag, setNewTag] = useState('');
    const [editingTag, setEditingTag] = useState({ old: '', new: '' });
    const [error, setError] = useState<string | null>(null);

    const loadTags = async () => {
        try {
            const worksheetTags = LocationService.getTags();
            // Ensure we have unique tags and they are properly sorted
            const uniqueTags = [...new Set(worksheetTags)].sort();
            setTags(uniqueTags);
            setError(null);
        } catch (error) {
            console.error('Error loading tags:', error);
            setError('Failed to load tags. Please try again.');
        }
    };

    useEffect(() => {
        loadTags().catch(error => {
            console.error('Error in loadTags effect:', error);
            setError('Failed to load tags. Please try again.');
        });
    }, []);

    const handleAdd = async () => {
        if (!newTag.trim()) {
            setError('Tag name cannot be empty');
            return;
        }
        if (tags.includes(newTag)) {
            setError('Tag already exists');
            return;
        }

        try {
            await LocationService.addTag(newTag);
            await loadTags(); // Refresh the tags list
            setNewTag('');
            setIsAddDialogOpen(false);
            setError(null);
        } catch (error) {
            console.error('Error adding tag:', error);
            setError('Failed to add tag. Please try again.');
        }
    };

    const handleEdit = async () => {
        if (!editingTag.new.trim()) {
            setError('Tag name cannot be empty');
            return;
        }
        if (tags.includes(editingTag.new) && editingTag.new !== editingTag.old) {
            setError('Tag already exists');
            return;
        }

        try {
            await LocationService.renameTag(editingTag.old, editingTag.new);
            await loadTags(); // Refresh the tags list
            setIsEditDialogOpen(false);
            setError(null);
        } catch (error) {
            console.error('Error editing tag:', error);
            setError('Failed to edit tag. Please try again.');
        }
    };

    const handleDelete = async (tag: string) => {
        if (window.confirm(`Are you sure you want to delete the tag "${tag}"? This will remove it from all locations using it.`)) {
            try {
                setError(null);
                // First remove the tag from the UI to prevent doubling
                setTags(currentTags => currentTags.filter(t => t !== tag));
                // Then delete from the service
                await LocationService.deleteTag(tag);
                // Finally refresh the tags to ensure sync
                await loadTags();
            } catch (error) {
                console.error('Error deleting tag:', error);
                setError('Failed to delete tag. Please try again.');
                // Refresh tags in case of error to ensure UI is in sync
                await loadTags();
            }
        }
    };

    return (
        <Box>
            <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h4" component="h1">
                    Tags
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<AddOutlined />}
                    onClick={() => setIsAddDialogOpen(true)}
                >
                    Add Tag
                </Button>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                </Alert>
            )}

            <Paper sx={{ mt: 2, p: 2 }}>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {tags.map((tag, index) => (
                        <Chip
                            key={`${tag}-${index}`}
                            label={tag}
                            onDelete={() => handleDelete(tag)}
                            onClick={() => {
                                setEditingTag({ old: tag, new: tag });
                                setIsEditDialogOpen(true);
                            }}
                        />
                    ))}
                </Box>
            </Paper>

            {/* Add Tag Dialog */}
            <Dialog open={isAddDialogOpen} onClose={() => setIsAddDialogOpen(false)}>
                <DialogTitle>Add New Tag</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Tag Name"
                        fullWidth
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleAdd} variant="contained">
                        Add
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Edit Tag Dialog */}
            <Dialog open={isEditDialogOpen} onClose={() => setIsEditDialogOpen(false)}>
                <DialogTitle>Edit Tag</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Tag Name"
                        fullWidth
                        value={editingTag.new}
                        onChange={(e) => setEditingTag({ ...editingTag, new: e.target.value })}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleEdit} variant="contained">
                        Save
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
} 